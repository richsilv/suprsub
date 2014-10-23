Accounts.onCreateUser(function (options, user) {
	user.profile = options.profile;
	if (user.profile.first_name && user.profile.last_name)
		user.profile.name === [user.profile.first_name, user.profile.last_name].join(' ');
	else if (user.profile.name) {
		var names = user.profile.name.split(' ');
		user.profile.first_name = names.shift();
		user.profile.last_name = names.join(' ');
	}
	Schemas.User.clean(user);
	return user;
});