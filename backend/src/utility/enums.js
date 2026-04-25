const taskStatus = {
	NOT_STARTED: 'NOT_STARTED',
	IN_PROGRESS: 'IN_PROGRESS',
	COMPLETED: 'COMPLETED',
};

const useraccountStatus = {
	ACTIVATED: 'ACTIVATED',
	NOT_ACTIVATED: 'NOT_ACTIVATED',
	DELETED: 'DELETED',
};

const workflowAccess = {
	PUBLIC: 'PUBLIC',
	PRIVATE: 'PRIVATE',
};

const vote = {
	UP_VOTE: 'UP_VOTE',
	DOWN_VOTE: 'DOWN_VOTE',
};

const commentType = {
	PUBLIC: 'PUBLIC',
	PRIVATE: 'PRIVATE',
};

module.exports = {
	taskStatus,
	useraccountStatus,
	vote,
	workflowAccess,
	commentType,
};
