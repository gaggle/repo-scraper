# Ideas for future features

## Actually handle pull-requests vs. open issues
Embarrassing I never got to this 🙈, IIRC needed to do one more API call to differentiate between the two types.


## How to handle cache growing stale?
How about just do caching to a unique tmp folder by default, that'll sidestep the issue. 
Someone can still specify a custom cachefolder, but they have to do their own invalidation.


## Handle more than 100 repos.
Another embarrasing missing feature, just need to keep fetching data if there's more.
