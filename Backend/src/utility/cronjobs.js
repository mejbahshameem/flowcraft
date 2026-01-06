const moment = require('moment');
const TaskInstance = require('../models/taskinstance');
const schedule = require('node-schedule');
const TaskNotification = require('../models/tasknotification');
const { taskStatus } = require('../utility/enums');
const { sendDeadlineNotification } = require('../utility/emailService');

//cron job time setting it to 6pm/18:00. Run cron job 6 hours before start sending emails to minimize latency.
//const notifiableusers = async function() {
//add this function while running the cronjob test
const calc_notifiableUsers = 18;
const scheduling = schedule.scheduleJob(
	`00 ${calc_notifiableUsers} * * *`, //change it to `* * * * *` while tetsing,
	async function() {
		try {
			let tasks = await TaskInstance.find({
				status: taskStatus.IN_PROGRESS,
				notification: true,
			});
			tasks.forEach(task => {
				if (
					moment
						.duration(
							moment(
								moment(task.timeFrame.timelog.end_time)
							).diff(moment(moment().format('YYYY-MM-DD')))
						)
						.asDays() < 3 &&
					moment
						.duration(
							moment(
								moment(task.timeFrame.timelog.end_time)
							).diff(moment(moment().format('YYYY-MM-DD')))
						)
						.asDays() >= 1
				) {
					try {
						const task_info = await TaskInstance.findOne({ _id: task._id })
							.populate('owner')
							.populate('workflow_instance');
						var notify_obj = new TaskNotification({
							follower_name: task_info.owner.name,
							follower_email: task_info.owner.email,
							task_name: task_info.name,
							step_no: task_info.step_no,
							end_time: moment(
								task_info.timeFrame.timelog.end_time
							),
							workflow_name:
								task_info.workflow_instance.name,
							task_id: task_info._id,
						});
						await notify_obj.save();
					} catch (error) {
						throw new Error(error.message);
					}
				}
			});
		} catch (error) {
			console.log(error);
		}
	}
);
//};
//cron job time setting it to 00/12:00am. Send email one day before the deadline
//const notify = async function() {
//uncomment the function above while testing
const sending_email_time = 0;
const notifyUser = schedule.scheduleJob(
	`00 ${sending_email_time} * * *`, //delete it and use it `* * * * *`
	async function() {
		try {
			const tasks = await TaskNotification.find({});

			tasks.forEach(task => {
				const time = moment(task.end_time)
					.add(-1, 'hours')
					.format('HH:mm:ss');
				const date = moment(task.end_time).format('dddd, MMMM Do YYYY');
				const date_time = {
					time,
					date,
				};
				sendDeadlineNotification(
					task.follower_name,
					task.follower_email,
					task.task_name, // Comment it while testing
					task.workflow_name,
					date_time
				);
			});
			await TaskNotification.deleteMany();
		} catch (error) {
			console.log(error);
		}
	}
);
//Enable this return while testing
// return {
// 	success: true,
// };
//};
// module.exports = { notifiableusers, notify }; // Enable this while testing
