// Configure environment constiable
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const { tokenAuthenticator } = require('./middlewares/token');
const cors = require('cors');

const indexRouter = require('./routes/index');
const userRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const foodRouter = require('./routes/foods');
const foodCategoryRouter = require('./routes/foodCategories');
const menuRouter = require('./routes/menus');
const foodAttributeRouter = require('./routes/foodAttributes');
const restaurantRouter = require('./routes/restaurants');
const testRouter = require('./routes/test');
const commandRouter = require('./routes/commands');
const foodTypeRouter = require('./routes/foodTypes');
const menuTitleRouter = require('./routes/menuTitle');
const postRouter = require('./routes/posts');
const messageRouter = require('./routes/messages');
const accompanimentRouter = require('./routes/accompaniment');
const translateRouter = require('./routes/translate');
const utilRouter = require('./routes/utils');
const adminMessageRouter = require('./routes/adminMessage');
const platRecommander = require('./routes/platRecommander');
const platPopulaire = require('./routes/platPopulaire');
const restoRecommanderRouter = require('./routes/restoRecommander');
const dashboardRouter = require('./routes/dashboard');
const verifyCodePromo = require('./routes/verifyCodePromo');
const viewRouter = require('./routes/view');
const mapMAtrix = require('./routes/mapMatrix');
var bodyParser = require('body-parser');

// Some utils import
require('./utils/array');

// connection to the mongoDB server
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoCreate: true,
});

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(
    cors({
        allowedHeaders: '*',
        exposedHeaders: '*',
    }),
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Use token authenticator
app.use(tokenAuthenticator);
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/users', userRouter);
app.use('/foods', foodRouter);
app.use('/foodCategories', foodCategoryRouter);
app.use('/foodAttributes', foodAttributeRouter);
app.use('/menus', menuRouter);
app.use('/restaurants', restaurantRouter);
app.use('/test', testRouter);
app.use('/commands', commandRouter);
app.use('/foodTypes', foodTypeRouter);
app.use('/menuTitle', menuTitleRouter);
app.use('/posts', postRouter);
app.use('/messages', messageRouter);
app.use('/accompaniments', accompanimentRouter);
app.use('/translate', translateRouter);
app.use('/utils', utilRouter);
app.use('/adminMessage', adminMessageRouter);
app.use('/platPopulaire', platPopulaire);
app.use('/restoRecommander', restoRecommanderRouter);
app.use('/dashboard', dashboardRouter);
app.use('/view', viewRouter);
app.use('/platRecommander', platRecommander);
app.use('/verifyCodePromo', verifyCodePromo);

// app.use('/mapMAtrix', mapMAtrix);

app.use(function(_, res) {
    res.status(404).send('Not found');
});

module.exports = app;