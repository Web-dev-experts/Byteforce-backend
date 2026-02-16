const AppError = require('../../utils/AppError');
const Project = require('../../model/Entries/projectModel');
const catchAsync = require('../../utils/catchAsync');
const User = require('../../model/User/userModel');
const Subscription = require('../../model/pricing/pricingModel');

exports.createProject = catchAsync(async (req, res, next) => {
  const { name, description, banner, field, languages } = req.body;

  const user = await User.findById(req.user._id);
  if (!name) return next(new AppError('The project must have a name!', 400));
  if (!description)
    return next(new AppError('The project must have a description!', 400));

  let addedUsers;
  if (req.body.users) addedUsers = req.body.users;
  addedUsers.push(req.user._id);
  const projectsCount = await Project.countDocuments({
    users: req.user._id,
  });
  const fullUser = await User.findById(req.user._id);
  if (!fullUser) return;
  const subscription = await Subscription.findById(fullUser.subscription);
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
  });

  res.status(200).json({
    status: 'success',
    data: {
      newProject,
    },
  });
});

exports.finishProject = catchAsync(async function (req, res, next) {
  const { projectId } = req.params;

  if (!projectId) return next(new AppError('There is no project id!', 404));

  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('Could not find any project with this Id', 404));

  await project.finishProject();

  res.status(200).json({
    status: 'success',
    data: {
      project,
    },
  });
});

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

exports.deleteProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('There is no project with this Id', 404));

  if (!project.users.includes(req.user._id))
    return next(
      new AppError("You can not delete a project that's not yours!", 403),
    );

  await Project.deleteOne({ _id: projectId });

  res.status(204).json({
    status: 'success',
    message: 'Project deleted!',
  });
});

exports.editProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const { name, description, users, languages, banner, field } = req.body;

  const project = await Project.findById(projectId);
  if (!project)
    return next(new AppError('There is no project with this Id', 404));
  if (users && users.length === 0)
    return next(new AppError('You can not delete All users!', 401));
  if (languages && languages.length === 0)
    return next(new AppError('You can not delete All languages!', 401));
  if (!project.users.includes(req.user._id))
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
  });

  res.status(200).json({
    status: 'success',
    message: 'Project edited!',
  });
});
