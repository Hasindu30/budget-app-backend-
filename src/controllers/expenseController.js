const Expense = require('../models/Expense');
const { checkBudgetNotification } = require('./notificationController');

// Create Expense
const addExpense = async (req, res) => {
  try {
    const { expenseName, amount, date, description } = req.body;

    if (!expenseName || !amount || !date) {
      return res.status(400).json({ message: 'Please fill required fields' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const expense = await Expense.create({
      user: req.user.id,
      expenseName,
      amount,
      date,
      description,
    });

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Expenses
const getExpenses = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { search = '', date = '', startDate = '', endDate = '' } = req.query;

    const query = {
      user: req.user.id,
    };

    if (search) {
      query.expenseName = { $regex: search, $options: 'i' };
    }

    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Expense
const updateExpense = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { id } = req.params;
    const { expenseName, amount, date, description } = req.body;

    const expense = await Expense.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { expenseName, amount, date, description },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or user not authorized' });
    }

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Expense
const deleteExpense = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { id } = req.params;

    const expense = await Expense.findOneAndDelete({ _id: id, user: req.user.id });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or user not authorized' });
    }

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.json({ message: 'Expense removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
};