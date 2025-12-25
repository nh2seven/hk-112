The current styling is great, lets keep it that way. Examine the following list of features to be added to the application. Examine the codebase as needed to understand how things are currently implemented, and implement the following features. Take a backup of the existing database before making any changes.

1. Add progress tracking for each region (new table)
2. Add progres tracking for each category (new table)
3. Make a landing page/dashboard that shows stats that show all completion metrics. Call this page `Overview`. As for stat tracking, show:
   - Overall completion percentage
   - Completion percentage by region (list all regions with their respective completion percentages)
   - Completion percentage by category (list all categories with their respective completion percentages)
   - Total number of items found vs total number of items, within each region, category, and overall.
   - Let these stats be clickable, such that clicking on a region or category takes the user to the item list page, filtered by that region/category.
   - Let the overall completion percentage be shown as a progress bar at the top of the page, as it exists now.
   - Every possible metric that we can get should be shown on this page, in a clean and organized manner. There is no constraint on how much space this page can take, so feel free to use as much space as needed to make it look good and organized.
4. The actual list of items should now become a separate page, called `112% Checklist`.
4. Add temporary item list page, such that users can create a custom list for each gameplay session (new table). Provide options to add/remove items from the temporary list, and to clear/save the list. Call this page `Current Session`. This should also store past sessions, allowing users to revisit them. Saving a list should store the timestamp and the items in that list, and add it to past sessions. When adding items to the temporary list, users should only be able to add items from the overall item list, no custom definitions for now (defer until this is confirmed to work as intended).
6. Add a navbar on the left side of the screen. This should obviously list all the pages: `Overview`, `112% Checklist`, `Current Session`, and `SQL Console` (SQL console is already implemented, you just need to move it around).

As each major feature is implemented, make sure to update the README.md file to reflect the new features, including any new API endpoints that were added. Also, commit these changes with clear commit messages. Begin by making your internal TODO list.