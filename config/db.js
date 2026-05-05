import 'dotenv/config';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // important for cloud DBs
        },
    },
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connected');

        await sequelize.sync({ alter: true });
        console.log('Database synced');

    } catch (error) {
        console.error('DB Connection Error:', error.message || error);
        console.error('Original:', error.original?.message);
        console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
        process.exit(1);
    }
};

export { sequelize };
export default connectDB;
