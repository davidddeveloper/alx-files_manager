import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const postNew = (req, res) => {
    const { body } = req;
    
    const { email, password } = body;

    if (!email) {
        return res.status(400).send({ error: 'email is required' });
    }
    if (!password) {
        return res.status(400).send({ error: 'password is required' });
    }

    dbClient.collection('users').findOne({ email }, (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Internal error' });
        }
        if (user) {
            return res.status(400).send({ error: 'Already exist' });
        }
    });


    function hashPassword(password) {
        return crypto.createHash('sha1').update(password).digest('hex');
    }

    const newUser = {
        email,
        hashPassword: hashPassword(password + salt),
    };
    dbClient.collection('users').insertOne(newUser, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Internal error' });
        }
        return res.status(200).send(
            {
                email: result.ops[0].email,
                id: result.ops[0]._id,
            }
        );
    });
};

module.exports = {
    postNew,
}