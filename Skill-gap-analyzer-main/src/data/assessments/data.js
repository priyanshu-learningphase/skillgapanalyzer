import { q } from './q.js';

export const DATA_BANK = {
  statistics: [
    q('concept', 'basic', 'What is the median of [3, 1, 9, 7, 20]?', ['5', '7', '8', '9'], 1, 'Sorted: 1, 3, 7, 9, 20 — the middle value is 7. (The mean is 8, pulled up by 20.)'),
    q('concept', 'intermediate', 'What is a p-value?', ['The probability the null hypothesis is true', 'The probability of data at least this extreme, assuming the null hypothesis is true', 'The effect size', 'The chance of a Type II error'], 1, 'It is not the probability that the hypothesis is true.'),
    q('concept', 'basic', 'Correlation does not imply…', ['Association', 'Causation', 'Linearity', 'Variance'], 1, 'Confounders can drive both variables.'),
    q('concept', 'basic', 'What is the mean of [2, 4, 4, 4, 5, 5, 7, 9]?', ['4', '4.5', '5', '6'], 2, 'The sum is 40 over 8 values.'),
    q('scenario', 'intermediate', 'Income data is heavily right-skewed. Which measure best describes typical income?', ['Mean', 'Median', 'Mode of the top 10%', 'Maximum'], 1, 'A few very high values pull the mean up.'),
    q('concept', 'intermediate', 'How should you interpret a 95% confidence interval?', ['95% of the data falls inside it', 'If sampling were repeated many times, about 95% of such intervals would contain the true value', 'There’s a 95% chance the sample mean is inside', 'The result is 95% significant'], 1, 'The confidence is in the procedure, not one interval.'),
    q('concept', 'intermediate', 'What is a Type I error?', ['Failing to reject a false null', 'Rejecting a true null hypothesis — a false positive', 'A data entry mistake', 'Using the wrong test'], 1, 'Its rate is controlled by your significance level α.'),
    q('concept', 'advanced', 'What happens when you increase the sample size?', ['Confidence intervals widen', 'Confidence intervals narrow and statistical power increases', 'Bias disappears', 'p-values always get larger'], 1, 'Standard error shrinks with √n.'),
  ],
  pandas: [
    q('code', 'basic', 'What does df.shape return?', ['Column names', '(rows, columns)', 'The data types', 'The memory size'], 1, 'shape is a tuple of dimensions.', 'df.shape'),
    q('code', 'basic', 'What does this select?', ['The age column', 'Rows where age is greater than 30', 'The first 30 rows', 'An error'], 1, 'A boolean mask filters rows.', "df[df['age'] > 30]"),
    q('code', 'basic', 'What does this return?', ['Sales for the first city', 'Total sales per city', 'The number of cities', 'Sorted sales'], 1, 'groupby + sum aggregates each group.', "df.groupby('city')['sales'].sum()"),
    q('code', 'basic', 'What does this give you?', ['Rows with missing values', 'The count of missing values per column', 'The DataFrame without NaNs', 'True or False'], 1, 'isna() returns booleans; sum() counts True per column.', 'df.isna().sum()'),
    q('scenario', 'intermediate', 'You need to join orders onto customers by customer_id, keeping every customer. What do you write?', ["pd.concat([customers, orders])", "pd.merge(customers, orders, on='customer_id', how='left')", "customers.append(orders)", "pd.merge(customers, orders, how='inner')"], 1, 'A left join keeps every row from the left frame.'),
    q('concept', 'intermediate', 'loc vs iloc?', ['Same thing', 'loc selects by label; iloc selects by integer position', 'iloc is for columns only', 'loc is deprecated'], 1, 'df.loc["a"] vs df.iloc[0].'),
    q('code', 'intermediate', 'Why do this?', ['To sort by date', 'To parse strings into datetimes so you can resample, filter and extract parts', 'To remove the column', 'To convert to Unix time only'], 1, 'Datetime dtype unlocks the .dt accessor and time-based indexing.', "df['date'] = pd.to_datetime(df['date'])"),
    q('concept', 'advanced', 'Why avoid df.iterrows() on large data?', ['It modifies the data', 'It’s slow — vectorised operations are much faster', 'It skips rows', 'It only works on strings'], 1, 'Prefer column operations, .map, or numpy.'),
  ],
  'machine-learning': [
    q('concept', 'basic', 'What does supervised learning require?', ['No data', 'Labelled examples', 'A neural network', 'Clustering'], 1, 'The model learns a mapping from inputs to known outputs.'),
    q('concept', 'basic', 'What is overfitting?', ['The model is too simple', 'The model fits training noise and performs poorly on new data', 'Training takes too long', 'Using too little data for testing'], 1, 'Watch the gap between training and validation scores.'),
    q('concept', 'basic', 'Why split data into train, validation and test sets?', ['To speed up training', 'To tune on validation data and estimate performance on unseen test data', 'Because libraries require it', 'To balance classes'], 1, 'Touch the test set only once, at the end.'),
    q('scenario', 'intermediate', 'A fraud model reports 99% accuracy, but only 1% of transactions are fraud. What’s wrong?', ['Nothing — ship it', 'Accuracy is misleading on imbalanced data; use precision, recall, F1 or PR-AUC', 'The model needs more layers', 'The test set is too large'], 1, 'Predicting “not fraud” every time already scores 99%.'),
    q('concept', 'intermediate', 'What does L1/L2 regularisation do?', ['Speeds up inference', 'Penalises large weights to reduce overfitting', 'Normalises input features', 'Adds more training data'], 1, 'L1 can also zero out features.'),
    q('concept', 'basic', 'Classification vs regression?', ['Same thing', 'Classification predicts categories; regression predicts continuous values', 'Regression is unsupervised', 'Classification needs images'], 1, 'Spam vs not spam vs predicting a price.'),
    q('concept', 'intermediate', 'What is data leakage?', ['Losing data in storage', 'Information from the test set or the future leaking into training, inflating metrics', 'A privacy breach', 'Missing values'], 1, 'Fit preprocessing on training data only.'),
    q('concept', 'advanced', 'As model complexity increases, what usually happens?', ['Bias and variance both rise', 'Bias decreases and variance increases', 'Bias increases and variance decreases', 'Neither changes'], 1, 'That’s the bias–variance trade-off.'),
  ],
};
