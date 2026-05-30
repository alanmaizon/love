# donations/signals.py
#
# v2: the User -> Profile auto-create signal was removed when the single-couple
# Profile model was retired in favour of Campaign (CP3). Hosts now create
# Campaigns explicitly; charity members are linked via accounts.OrgMembership.
# This module is intentionally empty but kept so donations/apps.py ready() import
# stays valid and future signals have a home.
