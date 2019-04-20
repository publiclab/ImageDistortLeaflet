#!/bin/bash

# Take a PR from Github, merge it into master/canary and push that into presubmit-master/canary
# so that presubmit will merge it into master/canary if all the tests pass.


PR_NUMBER=$1
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Stash local changes first.
if [ "$(git status -s --untracked-files=no)" ]; then
  git stash
  STASHED=true
fi

if [ $PR_NUMBER ]; then
  PR_BRANCH_CREATED=true
  PR_BRANCH="pr-$PR_NUMBER"
  git fetch upstream pull/$PR_NUMBER/head:$PR_BRANCH
  git checkout $PR_BRANCH
else
  echo "No PR number provided, merging the current branch."
  PR_BRANCH=$ORIGINAL_BRANCH
fi

# Make sure we have all the latest bits.
git fetch upstream master
git fetch upstream canary

# Determine whether the PR is based on master/canary.
COMMON_PARENT_CANARY=$(git merge-base $PR_BRANCH upstream/canary)
COMMON_PARENT_MASTER=$(git merge-base $PR_BRANCH upstream/master)

if [ $COMMON_PARENT_MASTER == $COMMON_PARENT_CANARY ]; then
  MERGE_INTO="master"
elif git merge-base --is-ancestor $COMMON_PARENT_CANARY $COMMON_PARENT_MASTER; then
  MERGE_INTO="master"
else
  MERGE_INTO="canary"
fi

# Do not merge feat changes into master.
if [ "$MERGE_INTO" = "master" ]; then
  DIFF_FEAT=$(git log $PR_BRANCH ^upstream/$MERGE_INTO --grep "^feat" --oneline)
  if [ "$DIFF_FEAT" ]; then
    echo "Can not merge features into master. Merging into canary instead."
    MERGE_INTO="canary"
  fi
fi

echo "Merging into $MERGE_INTO..."
git log $PR_BRANCH ^upstream/$MERGE_INTO --no-merges --oneline

# TODO(vojta): handle merge conflicts and push rejects
MERGING_BRANCH="presubmit-$MERGE_INTO-$PR_BRANCH"
git checkout -b $MERGING_BRANCH upstream/$MERGE_INTO
git merge $PR_BRANCH
git push upstream $MERGING_BRANCH

# Revert the original state of the workspace.
git checkout $ORIGINAL_BRANCH
if [ "$STASHED" ]; then
  git stash pop
fi

git branch -D $MERGING_BRANCH
if [ "$PR_BRANCH_CREATED" ]; then
  git branch -D $PR_BRANCH
fi

echo "PRESUBMIT BRANCH: $MERGING_BRANCH"
