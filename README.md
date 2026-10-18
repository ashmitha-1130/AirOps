# AirOps — Task Scheduling Analysis and Experimental Machine Learning

## 1. Project Overview

AirOps is a data analysis and experimental machine learning project focused on understanding task scheduling outcomes and identifying potential deadline feasibility issues.

The project explores scheduling-related datasets, compares machine learning classification models, and applies a rule-based time-window check to identify tasks whose required duration exceeds the time available before their deadline.

The objective of the current analysis is to establish a reproducible baseline, understand the limitations of the available data, and identify improvements required before a reliable predictive scheduling system can be developed.

**Current status:** Exploratory data analysis and initial model experimentation completed. Predictive performance remains unvalidated because of severe class imbalance and the very small dataset.

## 2. Project Objectives

- Explore and understand the structure and quality of all seven datasets.
- Identify missing values, inconsistencies, duplicate information, and limitations.
- Derive task scheduling outcomes from assignment records.
- Investigate class imbalance and its effect on model training and evaluation.
- Compare Logistic Regression, Random Forest, and XGBoost.
- Implement a rule-based check for task duration versus available time.
- Identify limitations and propose improvements for future experiments.

## 3. Dataset Overview

The project contains seven CSV datasets.

| Dataset | Rows | Purpose and observations |
|---|---:|---|
| `tasks.csv` | 30 | Task details, duration, priority, deadlines, required resource types, and skills. No missing values were observed. |
| `resources.csv` | 21 | Resource information. `availability_notes` is missing in 20 of 21 rows. |
| `staffs.csv` | 15 | Staff information. `availability_notes` is missing in 14 of 15 rows. |
| `constraints.csv` | 3 | Scheduling constraints. No missing values were observed. |
| `schedule_runs.csv` | 2 | Summary of two scheduling runs. Both report 30 total tasks, 29 scheduled tasks, and 1 unscheduled task. |
| `assignments.csv` | 60 | Assignment outcomes across two runs. There are 58 scheduled assignment rows and 2 unscheduled assignment rows. |
| `audit_logs.csv` | 5 | Audit information. `metadata_json` is missing in all five rows. |

*Dataset counts describe the files used in the current analysis. Before sharing the repository, confirm that these counts and the underlying data are approved for disclosure.*

### Important observations

- The task dataset contains 30 tasks, which is very small for training and evaluating a machine learning classifier.
- The two scheduling runs report identical overall scheduling outcomes.
- The assignment dataset contains repeated task outcomes across runs. These rows must not be treated as 60 independent task examples.
- Several descriptive fields are largely or entirely missing. Their absence should be investigated rather than automatically filled with invented values.
- The task records and scheduling results contain an important status inconsistency, explained below.

## 4. Data Quality and Preprocessing

### 4.1 Missing values

Missing-value analysis was performed before model development.

The most notable missing-value patterns were:

- `resources.csv`: 20 of 21 `availability_notes` values are missing.
- `staffs.csv`: 14 of 15 `availability_notes` values are missing.
- `audit_logs.csv`: all five `metadata_json` values are missing.
- Some descriptive and review fields in `schedule_runs.csv` are entirely missing.

**Decision:** No blanket imputation was performed.

Missing values can have different meanings. For example, a blank note may mean that no note was recorded, while missing availability information could mean that actual availability is unknown. Replacing such values without understanding their meaning could introduce false assumptions.

Future preprocessing should determine the meaning of each field and consult the data owner or authoritative source where necessary.

### 4.2 Scheduling-status inconsistency

The `scheduling_status` field in `tasks.csv` labels all 30 tasks as `unscheduled`.

However, `assignments.csv` indicates that 29 tasks were scheduled and one task was unscheduled in each run.

Therefore, `tasks.scheduling_status` was not used as a predictive feature or as the target label. Using it would conflict with the assignment outcomes and could produce misleading results.

The target variable was instead derived from `assignments.csv`.

### 4.3 Deriving the target variable

The target column is named `target_scheduled`.

- `1`: the task is recorded as scheduled.
- `0`: the task is recorded as unscheduled.

Assignment outcomes were grouped by `task_id`. Before taking one outcome per task, the analysis checked that a task did not have conflicting outcomes across records.

The resulting modelling dataset contains **30 task-level observations**, rather than 60 assignment rows.

### 4.4 Repeated scheduling runs

Both scheduling runs report the same overall outcomes, and the task-level results are identical across runs.

This means the two runs do not provide meaningful independent examples of different scheduling outcomes. Counting their assignment records as independent observations would overstate the amount of information available for learning.

## 5. Class Imbalance

The derived target contains:

| Class | Meaning | Task count | Percentage |
|---|---|---:|---:|
| 1 | Scheduled | 29 | 96.67% |
| 0 | Unscheduled | 1 | 3.33% |
| **Total** | | **30** | **100%** |

The dataset has severe class imbalance: almost every task is scheduled, and only one task is unscheduled.

### Why this is a problem

1. **Insufficient minority-class examples:** One unscheduled task is not enough to learn a reliable general pattern for unscheduled tasks.
2. **Misleading accuracy:** A model that predicts every task as scheduled would achieve 96.67% accuracy on the complete dataset without detecting any unscheduled task.
3. **Unreliable train/test evaluation:** The small number of examples makes the results highly sensitive to which tasks end up in the training and test sets.
4. **Limited generalisation:** The model may learn patterns associated with the available examples without learning the conditions that cause a task to become unscheduled.

### Train/test split difficulty

An 80/20 split was created using `train_test_split` with `random_state=42`.

The resulting training set contains 24 tasks:

- 23 scheduled tasks
- 1 unscheduled task

The test set contains six tasks:

- 6 scheduled tasks
- 0 unscheduled tasks

A stratified split was attempted but could not be performed because the minority class contained only one example. Stratification requires enough examples of each class to allocate them across the relevant subsets.

The original split was restored, and the models were trained using that split.

**Conclusion:** The test set cannot measure the models' ability to identify unscheduled tasks. A meaningful evaluation of minority-class detection is currently impossible with this dataset.

## 6. Feature Selection

The following five features were selected for the initial experiment:

- `category`
- `duration_minutes`
- `priority`
- `required_resource_type`
- `required_skill`

The target is `target_scheduled`.

The task identifier was not used as a predictive feature. The inconsistent `scheduling_status` field was also excluded.

The selected features were chosen to represent basic task characteristics. However, this feature set does not contain all information required to determine scheduling feasibility.

In particular, `earliest_start` and `deadline` were not included in the initial ML feature set. The classifier therefore cannot directly compare a task's required duration with its available time window.

The selected feature set is an initial experimental baseline, not a complete representation of the scheduling problem.

## 7. Machine Learning Models

Three classification models were trained using Scikit-learn pipelines.

### 7.1 Logistic Regression

Logistic Regression provides a relatively simple classification baseline. It estimates the probability of a task belonging to a particular class based on the selected features.

### 7.2 Random Forest

Random Forest combines multiple decision trees to make a classification prediction. It can represent nonlinear relationships and interactions between features.

It was selected provisionally for the demonstration, but the available results do not establish that it is superior to the other models.

### 7.3 XGBoost

XGBoost is a gradient-boosted tree method. It builds trees sequentially to improve the model's predictions.

The experiment used 50 estimators, a maximum tree depth of 2, a learning rate of 0.1, and a fixed random seed of 42.

### Preprocessing

Categorical features were one-hot encoded, while numerical features were passed through. The preprocessing and estimator were combined into pipelines to keep the transformations consistent during training and prediction.

The train/test split used an 80/20 ratio and `random_state=42`.

## 8. Model Evaluation Results

All three models were evaluated on the same six-task test set.

| Model | Test accuracy | Precision/recall interpretation | Limitation |
|---|---:|---|---|
| Logistic Regression | 100% | The test predictions were correct for all six scheduled tasks. | No unscheduled task was present in the test set. |
| Random Forest | 100% | The test predictions were correct for all six scheduled tasks. | No unscheduled task was present in the test set. |
| XGBoost | 100% | The test predictions were correct for all six scheduled tasks. | No unscheduled task was present in the test set. |

All three models predicted the scheduled class for all six test examples.

### What does 100% accuracy mean here?

It means that all six predictions matched the labels in this particular test set. It does **not** demonstrate that the models can reliably classify new tasks or detect unscheduled tasks.

The test set contains only one class, so it cannot evaluate performance on the unscheduled class. The identical results also do not establish that the three models have equal predictive ability.

A classifier that always predicts `scheduled` would also achieve 100% accuracy on this particular test set.

For the same reason, ROC-AUC was not calculated: the test set does not contain both classes needed for a meaningful ROC-AUC evaluation.

### Evaluation limitations

- The test set has only six examples.
- The test set contains no unscheduled tasks.
- The minority class has only one example in the complete dataset.
- The dataset is too small to support reliable model selection.
- A high accuracy score is not sufficient evidence of operational readiness.

The current accuracy results should be described as **preliminary test-set results**, not as evidence of a reliable scheduling prediction system.

## 9. Model Selection and Saved Pipeline

Random Forest was chosen provisionally as the demonstration model. This choice is for experimentation and implementation convenience, not because the evaluation proved it was the best-performing model.

The trained pipeline was saved as:

`airops_random_forest_pipeline.pkl`

The saved pipeline was loaded again, and predictions were reproduced successfully on the existing test features.

This confirms that the saved pipeline can be reloaded and used for the same feature format. It does not independently validate its predictive performance.

Only load serialized model files from trusted sources.

## 10. New-Task Prediction Experiment

A sample task was passed to the loaded Random Forest pipeline using these features:

- Category: maintenance
- Duration: 300 minutes
- Priority: 5
- Required resource type: maintenance bay
- Required skill: maintenance

The classifier predicted `scheduled`, with an estimated scheduled-class probability of approximately 51%.

This result illustrates an important limitation: the classifier's output does not guarantee that a task is feasible.

The initial classifier does not use the task's earliest start time or deadline, and it does not fully evaluate staff availability, resource conflicts, or other scheduling constraints. Its prediction must not be treated as an authoritative scheduling decision.

The estimated probability is a model output, not a statement that the model is 51% accurate.

## 11. Rule-Based Time-Window Feasibility Check

To complement the ML experiment, a separate rule-based check was implemented using the task's start time, deadline, and required duration.

The check calculates:

**Available time in minutes**

`deadline - earliest_start`

**Time-window fit**

`duration_minutes <= available_minutes`

**Time shortfall**

`max(duration_minutes - available_minutes, 0)`

The current dataset produced the following results:

- 29 tasks fit within their available time windows.
- 1 task exceeds its available time window.

The identified task has a required duration of 300 minutes but only 60 minutes available, producing a shortfall of 240 minutes.

This illustrates why deterministic rules can be useful alongside machine learning. A direct comparison of duration and available time can identify a clear deadline conflict even when a classifier predicts that a task is scheduled.

**Important limitation:** This is a time-window check, not a complete scheduler. A task fitting within its time window does not prove that the necessary staff and resources are available or that every scheduling constraint is satisfied.

## 12. Main Challenges Encountered

### Challenge 1: Severe class imbalance

Only one task is labelled unscheduled.

**Impact:** The model cannot learn a reliable representation of the minority class, and meaningful test evaluation of unscheduled-task detection is not possible.

**Current response:** The class distribution and test-set limitation are documented. The models are treated as experimental.

### Challenge 2: Stratified splitting failed

The minority class contains fewer examples than required to distribute it across the training and test sets.

**Impact:** The unscheduled class cannot be represented in both subsets through the attempted stratified split.

**Current response:** The original split was restored, and the resulting limitation was explicitly documented.

### Challenge 3: Misleading accuracy

All models achieved 100% test accuracy, but all six test examples were scheduled.

**Impact:** The results can create a false impression of excellent generalisation.

**Current response:** The README reports the test-set composition alongside accuracy and does not claim reliable unscheduled-task detection.

### Challenge 4: Conflicting status information

The task table labels every task as unscheduled, whereas the assignment table reports 29 scheduled tasks and one unscheduled task.

**Impact:** Using the wrong status field could produce incorrect labels and invalidate the experiment.

**Current response:** The target was derived from assignment outcomes, and the inconsistent status field was excluded from the model features.

### Challenge 5: Repeated outcomes across runs

The assignment file contains 60 rows, but these correspond to two runs over the same 30 tasks with identical task-level outcomes.

**Impact:** Treating all 60 rows as independent training examples would inflate the apparent sample size.

**Current response:** One validated outcome per task was used to construct the 30-row modelling dataset.

### Challenge 6: Missing data without sufficient context

Several availability and descriptive fields contain large numbers of missing values.

**Impact:** Arbitrary imputation could introduce unsupported assumptions about resource or staff availability.

**Current response:** No blanket imputation was applied.

### Challenge 7: ML prediction versus actual feasibility

The classifier does not include all time-window or resource-availability constraints.

**Impact:** A predicted `scheduled` label cannot guarantee that a task is feasible.

**Current response:** A separate deterministic duration-versus-deadline check was added.

## 13. Recommendations for Future Work

1. **Obtain more labelled scheduling examples.** In particular, obtain verified examples of both scheduled and unscheduled tasks, ideally including different causes of scheduling failure.
2. **Validate the labels.** Resolve the conflict between task-level status and assignment outcomes with the data owner or authoritative scheduling source.
3. **Understand the missing values.** Establish what missing availability information means before deciding whether to retain, transform, or impute it.
4. **Use a suitable evaluation design.** Once enough independent examples exist, use a stratified split or an appropriate cross-validation strategy. Repeated records from the same task should not be allowed to leak across training and test sets.
5. **Evaluate minority-class performance.** Report the confusion matrix, precision, recall, F1-score, and balanced accuracy where appropriate. Accuracy alone is insufficient.
6. **Establish a simple baseline.** Compare models with a majority-class baseline and rule-based checks.
7. **Improve the feature set carefully.** Consider verified timing, availability, and constraint information only when it is appropriate to use and available at prediction time.
8. **Expand the feasibility rules.** Include verified staff availability, resource conflicts, task dependencies, and other applicable constraints before describing the system as a complete scheduler.
9. **Keep model claims conservative.** Reassess model choice after the dataset and evaluation design improve.
10. **Protect sensitive information.** Confirm that all datasets, logs, identifiers, notebook outputs, reports, and trained artifacts are approved for the intended repository visibility.

## 14. Current Project Deliverables

The current working folder includes:

- `airops_analysis.ipynb` — exploratory analysis, model experimentation, and feasibility-check implementation.
- `airops_random_forest_pipeline.pkl` — saved Random Forest preprocessing and classification pipeline.
- `airops_feasibility_report.csv` — task-level results from the time-window feasibility check.
- `airops_model_comparison.csv` — model comparison results.
- `.gitignore` — rules for excluding selected generated or local files.
- `README.md` — project documentation and analysis findings.

The exact filenames should be checked against the local project folder before sharing.

## 15. Conclusion

The AirOps analysis establishes an initial workflow for exploring scheduling data, training experimental classifiers, and checking task duration against available time.

The most important finding is not the 100% test accuracy. It is that the available data is too small and too imbalanced to establish reliable predictive performance.

The rule-based time-window check provides a transparent way to identify duration-versus-deadline conflicts, but it does not replace a complete constraint-aware scheduling system.

Further work should focus on verified labels, more independent examples of unscheduled tasks, better evaluation, and validated resource and timing constraints before the models are considered reliable for practical scheduling decisions.

