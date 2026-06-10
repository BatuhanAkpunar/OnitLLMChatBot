---
key: test-matrix
title: Combinatorial test matrix
description: Turn requirements or code into a compact pairwise test matrix: parameters, equivalence-partitioned values, constraints, and expected results.
intent: Get broad combination coverage with the fewest test cases by modeling inputs as parameters and covering every value PAIR at least once, instead of writing cases ad hoc.
skill_type: component
best_for: designing test cases for multi-parameter features, covering configuration matrices with few tests, finding untested input combinations
triggers: test cases, test plan, test matrix, edge cases, combinations, coverage, pairwise
role_keys: qa
sort_order: 6
---

## Purpose
Design tests systematically instead of brainstorming them. Model the feature as parameters and values, apply constraints for impossible combinations, and emit a small table where every pair of values appears together at least once (pairwise coverage). Most real bugs involve interactions of one or two parameters, so pairwise finds the bulk of them with a fraction of the full cartesian product.

## Method
1. **Extract parameters** from the requirement or code: inputs, configuration options, user states, environmental factors. Name them clearly.
2. **Partition values**: for each parameter, list equivalence classes plus boundaries (for "amount": 0, 1, typical, max, max+1). 3-5 values per parameter is the sweet spot; more usually means the partitioning is too fine.
3. **State constraints**: business rules that make combinations invalid ("guest users cannot have saved cards"). Write them as IF/THEN one-liners. Constrained-away combinations need ONE negative test each, not full coverage.
4. **Generate the matrix**: produce a numbered markdown table where each row is a test case and every value pair across parameters appears in at least one row. Aim for roughly the size of (largest parameter x second largest), not the full product.
5. **Add expected results**: one column stating the observable outcome per row. A row without a checkable expectation is not a test.
6. **Append negative tests**: one row per constraint, verifying the system rejects the invalid combination gracefully.

## Output format
- The parameter/value model (with constraints) first, so it can be reviewed and reused.
- The test table: # | parameter columns | expected result.
- A short "not covered" note: what pairwise deliberately misses (3-way interactions) and which 2-3 risky triples deserve extra cases.

## Anti-patterns
- Listing 50 hand-written cases that still miss pairs while duplicating others.
- Parameters with overlapping values ("logged in" as both a parameter and a value of another).
- Tables without expected results.

## When NOT to use
For single-parameter features or pure UI copy changes, a short checklist beats a matrix. For algorithmic logic, property-based thinking (invariants) may fit better; say so.
