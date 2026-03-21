const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getDashboardSummary, getAllTransactions, getMonthlyStats } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/transactions', protect, getAllTransactions);
router.get('/monthly-stats', protect, getMonthlyStats);

module.exports = router;