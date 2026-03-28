const User = require('../../model/User/userModel');
const AppError = require('../../utils/AppError');
const Project = require('../../model/Entries/projectModel');
const catchAsync = require('../../utils/catchAsync');
const Subscription = require('../../model/pricing/pricingModel');
const { default: axios } = require('axios');

// ── Create project ────────────────────────────────────────
// Creates a project and adds the requesting user as a member.
// Checks the subscription project limit before creation.
exports.createProject = catchAsync(async (req, res, next) => {
  const { name, description, banner, field, languages, repoUrl } = req.body;

  const user = await User.findById(req.user._id).select('+githubAccessToken');
  if (!user) return next(new AppError('There is no user!', 404));
  if (!repoUrl)
    return next(new AppError('The project must have a repo URL!', 400));
  const existing = await Project.findOne({ repoUrl });
  if (existing)
    return next(
      new AppError('This repo is already linked to another project!', 400),
    );
  if (user.githubAccessToken) {
    const match = req.body.repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (match) {
      const repo = match[1].replace('.git', '');
      try {
        await axios.get(`https://api.github.com/repos/${repo}`, {
          headers: { Authorization: `Bearer ${user.githubAccessToken}` },
        });
      } catch (err) {
        return next(
          new AppError(
            'This GitHub repo does not exist or is not accessible!',
            400,
          ),
        );
      }
    }
  }
  if (!name) return next(new AppError('The project must have a name!', 400));
  if (!description)
    return next(new AppError('The project must have a description!', 400));

  // Safe initialization — if no users array is provided, start with an empty array.
  const addedUsers = req.body.users ? [...req.body.users] : [];
  // Always include the creator in the project members.
  addedUsers.push(req.user._id);
  const projectsCount = await Project.countDocuments({
    users: req.user._id,
  });
  const subscription = await Subscription.findById(user.subscription);
  if (!subscription) return next(new AppError('You have no subsciprion', 404));
  if (subscription.maxProjects <= projectsCount)
    return next(
      new AppError(
        `You have reached your ${subscription.name} plan project limit! Upgrade your plan to create a new one`,
      ),
    );

  const newProject = await Project.create({
    name,
    description,
    banner,
    field,
    languages,
    users: addedUsers,
    repoUrl,
  });

  for (const userId of addedUsers) {
    const user = await User.findById(userId);
    user.projects.push(newProject._id);
    await user.save();
  }
  res.status(200).json({
    status: 'success',
    data: {
      newProject,
    },
  });
});

// ── Finish project ────────────────────────────────────────
// Sets the project status to 'finished' and records the endDate.
// Uses finishProject() method defined on the model.
exports.finishProject = catchAsync(async function (req, res, next) {
  const { projectId } = req.params;

  if (!projectId) return next(new AppError('There is no project id!', 404));

  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('Could not find any project with this Id', 404));

  await project.finishProject();
  await project.save();

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

// ── Get project ───────────────────────────────────────────
// Public within the API — any authenticated user can view any project.
// No ownership check is enforced here.
exports.getProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('Could not find any project with this Id', 404));
  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

// ── Delete project ────────────────────────────────────────
// Only a project member can delete it.
exports.deleteProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('There is no project with this Id', 404));

  if (!project.users.some((id) => id.equals(req.user._id)))
    return next(
      new AppError("You can not delete a project that's not yours!", 403),
    );

  await Project.deleteOne({ _id: projectId });

  res.status(204).json({
    status: 'success',
    message: 'Project deleted!',
  });
});

// ── Edit project ──────────────────────────────────────────
exports.editProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const userId = req.user._id;
  const { name, description, users, languages, banner, field, leaders } =
    req.body;

  const project = await Project.findById(projectId);

  // 1. Check if the user's ID exists anywhere inside the leaders array
  const isLeader = project.leaders.some(
    (id) => id.toString() === userId.toString(),
  );

  // 2. If they are NOT in the array, throw the error
  if (!isLeader) {
    return next(
      new AppError(
        'You do not have permission to create a project quest! Only leaders are allowed to',
        403,
      ),
    );
  }

  if (!project)
    return next(new AppError('There is no project with this Id', 404));
  if (users && users.length === 0)
    return next(new AppError('You can not delete All users!', 401));
  if (languages && languages.length === 0)
    return next(new AppError('You can not delete All languages!', 401));
  if (leaders && leaders.length === 0)
    return next(new AppError('You can not delete All leaders!', 401));
  if (!project.users.some((id) => id.equals(req.user._id)))
    return next(
      new AppError("You can not edit a project that's not yours!", 403),
    );

  const editedProject = await Project.findByIdAndUpdate(projectId, {
    name,
    description,
    users,
    languages,
    banner,
    field,
    leaders,
  });

  res.status(200).json({
    status: 'success',
    message: 'Project edited!',
  });
});
