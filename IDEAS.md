# Ideas for future features

## How to handle cache growing stale?
How about just do caching to a unique tmp folder by default, that'll sidestep the issue. 
Someone can still specify a custom cachefolder, but they have to do their own invalidation.


## Handle more than 100 repos.
Just need to keep fetching data if there's more.
