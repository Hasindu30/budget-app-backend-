const Income = require('../models/Income');
const { checkBudgetNotification } = require('./notificationController');

// Create Income
const addIncome = async (req, res) => {
  try {
    const { incomeName, amount, date, description } = req.body;

    if (!incomeName || !amount || !date) {
      return res.status(400).json({ message: 'Please fill required fields' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const income = await Income.create({
      user: req.user.id,
      incomeName,
      amount,
      date,
      description,
    });

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.status(201).json(income);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get All Incomes with optional search + date filter
const getIncomes = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { search = '', date = '', startDate = '', endDate = '' } = req.query;

    const query = {
      user: req.user.id,
    };

    if (search) {
      query.incomeName = { $regex: search, $options: 'i' };
    }

    if (date) {
      query.date = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const incomes = await Income.find(query).sort({ date: -1, createdAt: -1 });

    res.json(incomes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Income
const updateIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const { incomeName, amount, date, description } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Check if the income belongs to the authenticated user
    if (income.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this income' });
    }

    const updatedIncome = await Income.findByIdAndUpdate(
      id,
      { incomeName, amount, date, description },
      { new: true, runValidators: true }
    );

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.status(200).json(updatedIncome);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Income
const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const income = await Income.findById(id);

    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }

    // Check if the income belongs to the authenticated user
    if (income.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this income' });
    }

    await Income.findByIdAndDelete(id);

    // Check for budget notifications BEFORE responding
    await checkBudgetNotification(req.user.id);

    res.status(200).json({ message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addIncome,
  getIncomes,
  updateIncome,
  deleteIncome,
};