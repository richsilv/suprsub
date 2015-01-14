/*****************************************************************************/
/* Utility Methods */
/*****************************************************************************/

var Future = Meteor.npmRequire('fibers/future'),
    proxy;

Meteor.methods({
	'utility/impersonate': function(userId, password) {
        var correctPasswordObject = SecureData.findOne({
            key: "password"
        });
        if (!userId) userId = Meteor.users.findOne({})._id;
        if (correctPasswordObject && correctPasswordObject.value === password) {
            check(userId, String);

            if (!Meteor.users.findOne(userId))
                throw new Meteor.Error('user_not_found', 'User not found');

            this.setUserId(userId);
            return userId
        }
        else
        	throw new Meteor.Error('incorrect_password', 'Incorrect password');
    }
});