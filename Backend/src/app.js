const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
require('./db/mongoose');
const userRouter = require('./routers/user');
const workFlowRouter = require('./routers/workflow');
const taskRouter = require('./routers/task');
const commentRouter = require('./routers/comment');
const userworkflowRouter = require('./routers/userworkflowcontrol');
const healthRouter = require('./routers/health');
require('./utility/cronjobs');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(',')
	: ['http://localhost:4200'];

app.use(helmet());
app.use(cors({
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

app.use(healthRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1', userRouter);
app.use('/api/v1', workFlowRouter);
app.use('/api/v1', taskRouter);
app.use('/api/v1', commentRouter);
app.use('/api/v1', userworkflowRouter);

app.use(errorHandler);

module.exports = app;
