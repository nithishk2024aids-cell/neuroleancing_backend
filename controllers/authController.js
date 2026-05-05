import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('jwt', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });

    return token;
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, phoneNumber, experience, portfolio, companyName, projectInterests } = req.body;

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name, email, password,
            role: role || 'client',
            phoneNumber, experience, portfolio, companyName, projectInterests
        });

        const token = generateToken(res, user.id);
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            profileComplete: false,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(res, user.id);
            res.json({
                _id:             user.id,
                name:            user.name,
                email:           user.email,
                role:            user.role,
                profileImage:    user.profileImage,
                profileComplete: user.profileComplete,
                skills:          user.skills   || [],
                title:           user.title    || '',
                bio:             user.bio      || '',
                location:        user.location || '',
                hourlyRate:      user.hourlyRate ?? null,
                token,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'none',
        expires: new Date(0)
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                title: user.title,
                bio: user.bio,
                skills: user.skills,
                location: user.location,
                hourlyRate: user.hourlyRate,
                profileImage: user.profileImage,
                phoneNumber: user.phoneNumber,
                experience: user.experience,
                portfolio: user.portfolio,
                companyName: user.companyName,
                projectInterests: user.projectInterests,
                totalEarnings: user.totalEarnings,
                totalSpent: user.totalSpent,
                newMessages: user.newMessages,
                profileComplete: user.profileComplete,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
