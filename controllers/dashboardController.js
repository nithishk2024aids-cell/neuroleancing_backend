import Project from '../models/Project.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

// @desc  Get all dashboard stats for the logged-in user
// @route GET /api/dashboard/stats
// @access Private
export const getDashboardStats = async (req, res) => {
    try {
        const uid  = req.user.id;
        const role = req.user.role;

        // ── Date helpers ──────────────────────────────────────
        const now          = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPrev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrev    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // ── Fetch in parallel ─────────────────────────────────
        const [allProjects, unreadCount, userRecord] = await Promise.all([
            Project.findAll({
                attributes: ['id', 'title', 'status', 'budget', 'clientId', 'assignedTo', 'proposals', 'updatedAt'],
            }),
            Message.count({ where: { receiverId: uid, read: false } }),
            User.findByPk(uid),  // full record — needed for sync + skills
        ]);

        const userProjects = allProjects.filter(p => {
            if (role === 'client') return p.clientId === uid;
            return (
                p.assignedTo === uid ||
                (p.proposals || []).some(prop => prop.freelancer === uid)
            );
        });

        // ── Role-specific stats ───────────────────────────────
        let totalEarnings   = 0;
        let totalSpent      = 0;
        let jobsCompleted   = 0;
        let activeJobs      = 0;
        let monthlyEarnings = 0;
        let prevEarnings    = 0;

        if (role === 'freelancer') {
            const completed = userProjects.filter(p => p.assignedTo === uid && p.status === 'completed');
            jobsCompleted   = completed.length;
            activeJobs      = userProjects.filter(p => p.assignedTo === uid && p.status === 'assigned').length;
            totalEarnings   = completed.reduce((s, p) => s + (p.budget || 0), 0);
            monthlyEarnings = completed.filter(p => new Date(p.updatedAt) >= startOfMonth).reduce((s, p) => s + (p.budget || 0), 0);
            prevEarnings    = completed.filter(p => { const d = new Date(p.updatedAt); return d >= startOfPrev && d <= endOfPrev; }).reduce((s, p) => s + (p.budget || 0), 0);

            // Sync DB if drifted
            if (userRecord && (userRecord.totalEarnings !== totalEarnings || userRecord.jobsCompleted !== jobsCompleted)) {
                await userRecord.update({ totalEarnings, jobsCompleted });
            }
        } else {
            const completed = userProjects.filter(p => p.status === 'completed');
            jobsCompleted   = completed.length;
            activeJobs      = userProjects.filter(p => p.status === 'assigned' || p.status === 'open').length;
            totalSpent      = completed.reduce((s, p) => s + (p.budget || 0), 0);
            monthlyEarnings = completed.filter(p => new Date(p.updatedAt) >= startOfMonth).reduce((s, p) => s + (p.budget || 0), 0);
            prevEarnings    = completed.filter(p => { const d = new Date(p.updatedAt); return d >= startOfPrev && d <= endOfPrev; }).reduce((s, p) => s + (p.budget || 0), 0);

            if (userRecord && userRecord.totalSpent !== totalSpent) {
                await userRecord.update({ totalSpent });
            }
        }

        // ── Monthly growth % ──────────────────────────────────
        let monthlyGrowth = 0;
        if (prevEarnings > 0) {
            monthlyGrowth = Math.round(((monthlyEarnings - prevEarnings) / prevEarnings) * 100);
        } else if (monthlyEarnings > 0) {
            monthlyGrowth = 100;
        }

        // ── Recent projects (last 5, with title) ─────────────
        const recentProjects = [...userProjects]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5)
            .map(p => ({
                id:        p.id,
                title:     p.title,
                status:    p.status,
                budget:    p.budget,
                updatedAt: p.updatedAt,
            }));

        res.json({
            totalEarnings:  role === 'freelancer' ? totalEarnings : totalSpent,
            monthlyEarnings,
            monthlyGrowth,
            jobsCompleted,
            activeJobs,
            totalProjects:  userProjects.length,
            notifications:  unreadCount,
            recentProjects,
            skills:         Array.isArray(userRecord?.skills) ? userRecord.skills : (req.user.skills || []),
        });

    } catch (err) {
        console.error('Dashboard stats error:', err.message);
        res.status(500).json({ message: err.message });
    }
};
