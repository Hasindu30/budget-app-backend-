const Income = require('../models/Income');
const Expense = require('../models/Expense');
const { checkMonthlySummary } = require('./notificationController');

const getMonthRangeStrings = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');

  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-31`;

  return { start, end };
};

const getDashboardSummary = async (req, res) => {
  try {
    // Check for monthly summary notification asynchronously
    checkMonthlySummary(req.user.id);

    const { start, end } = getMonthRangeStrings();

    const incomes = await Income.find({
      user: req.user.id,
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    const expenses = await Expense.find({
      user: req.user.id,
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const monthlyBudget = totalIncome - totalExpense;

    const incomeTransactions = incomes.map((item) => ({
      id: item._id,
      type: 'income',
      name: item.incomeName,
      date: item.date,
      amount: item.amount,
      description: item.description || '',
      createdAt: item.createdAt,
    }));

    const expenseTransactions = expenses.map((item) => ({
      id: item._id,
      type: 'expense',
      name: item.expenseName,
      date: item.date,
      amount: item.amount,
      description: item.description || '',
      createdAt: item.createdAt,
    }));

    const recentTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);

    res.status(200).json({
      month: start.slice(0, 7),
      monthlyBudget,
      totalIncome,
      totalExpense,
      recentTransactions,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const { search = '', date = '', startDate = '', endDate = '' } = req.query;

    const incomeQuery = { user: req.user.id };
    const expenseQuery = { user: req.user.id };

    if (search) {
      incomeQuery.incomeName = { $regex: search, $options: 'i' };
      expenseQuery.expenseName = { $regex: search, $options: 'i' };
    }

    if (date) {
      incomeQuery.date = date;
      expenseQuery.date = date;
    } else if (startDate || endDate) {
      const dateRange = {};
      if (startDate) dateRange.$gte = startDate;
      if (endDate) dateRange.$lte = endDate;
      incomeQuery.date = dateRange;
      expenseQuery.date = dateRange;
    }

    const incomes = await Income.find(incomeQuery).sort({ createdAt: -1 });
    const expenses = await Expense.find(expenseQuery).sort({ createdAt: -1 });

    const incomeTransactions = incomes.map((item) => ({
      id: item._id,
      type: 'income',
      name: item.incomeName,
      date: item.date,
      amount: item.amount,
      description: item.description || '',
      createdAt: item.createdAt,
    }));

    const expenseTransactions = expenses.map((item) => ({
      id: item._id,
      type: 'expense',
      name: item.expenseName,
      date: item.date,
      amount: item.amount,
      description: item.description || '',
      createdAt: item.createdAt,
    }));

    const allTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(allTransactions);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

const getMonthlyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const incomes = await Income.find({ user: userId });
    const expenses = await Expense.find({ user: userId });

    const statsMap = {};

    incomes.forEach((item) => {
      const monthStr = item.date.slice(0, 7); // YYYY-MM
      if (!statsMap[monthStr]) {
        statsMap[monthStr] = { month: monthStr, totalIncome: 0, totalExpense: 0, budget: 0 };
      }
      statsMap[monthStr].totalIncome += Number(item.amount || 0);
    });

    expenses.forEach((item) => {
      const monthStr = item.date.slice(0, 7); // YYYY-MM
      if (!statsMap[monthStr]) {
        statsMap[monthStr] = { month: monthStr, totalIncome: 0, totalExpense: 0, budget: 0 };
      }
      statsMap[monthStr].totalExpense += Number(item.amount || 0);
    });

    const monthlyStats = Object.values(statsMap).map((s) => ({
      ...s,
      budget: s.totalIncome - s.totalExpense,
    }));

    // Sort by month descending (newest first)
    monthlyStats.sort((a, b) => b.month.localeCompare(a.month));

    res.status(200).json(monthlyStats);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
  getAllTransactions,
  getMonthlyStats,
};