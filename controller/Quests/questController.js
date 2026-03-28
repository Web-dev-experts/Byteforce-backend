const Project = require('../../model/Entries/projectModel');
const Quest = require('../../model/Quests/questModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const QuestProgress = require('../../model/Quests/questProgressModel');

exports.createProjectQuest = catchAsync(async function (req, res, next) {
  const { name, description, frequency, objectiveType, objective, rewardType } =
    req.body;

  const projectId = req.params.projectId;

  const userId = req.user._id;

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
    return next(new AppError('There is no project with this ID', 400));

  if (!name) return next(new AppError('The quest must have a name!', 400));
  if (!description)
    return next(new AppError('The quest must have a description!', 400));
  if (!frequency)
    return next(new AppError('The quest must have a frequency!', 400));
  if (!objectiveType)
    return next(new AppError('The quest must have a objectiveType!', 400));
  if (!objective)
    return next(new AppError('The quest must have a objective!', 400));
  if (!rewardType)
    return next(new AppError('The quest must have a rewardType!', 400));
  if (!projectId)
    return next(new AppError('The quest must have a projectId!', 400));

  const quest = await Quest.create({
    name,
    description,
    frequency,
    scope: 'project',
    objectiveType,
    objective,
    rewardType: 'coins',
    projectId,
  });

  project.users.map(async (user) => {
    await QuestProgress.create({
      quest: quest._id,
      user: user._id,
      progressType: objectiveType,
    });
  });

  res.status(200).json({
    status: 'success',
    quest,
  });
});
