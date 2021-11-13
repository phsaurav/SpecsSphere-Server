const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const ObjectId = require('mongodb').ObjectId;
const port = process.env.PORT || 5000;
var admin = require('firebase-admin');
var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

async function verifyToken(req, res, next) {
	if (req.headers.authorization?.startsWith('Bearer ')) {
		const idToken = req.headers.authorization.split(' ')[1];
		try {
			const decodedUser = await admin.auth().verifyIdToken(idToken);
			req.decodedEmail = decodedUser.email;
		} catch {}
	}
	next();
}

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ndta.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

async function run() {
	try {
		await client.connect();
		console.log('Connected to Database!');
		const database = client.db('specsSphereDB');
		const productCollection = database.collection('productCollection');
		const reviewCollection = database.collection('reviewCollection');
		const userCollection = database.collection('users');
		const orderCollection = database.collection('orderCollection');

		//*GET All Product Api
		app.get('/products', async (req, res) => {
			const cursor = productCollection.find({});
			const products = await cursor.toArray();
			res.send(products);
		});
		//*GET A Single Product
		app.get('/products/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const product = await productCollection.findOne(query);
			res.json(product);
		});
		//*GET All Review Api
		app.get('/reviews', async (req, res) => {
			const cursor = reviewCollection.find({});
			const reviews = await cursor.toArray();
			res.send(reviews);
		});
		//*GET All Order Api
		app.get('/order', async (req, res) => {
			const cursor = orderCollection.find({});
			const orders = await cursor.toArray();
			res.send(orders);
		});
		//*GET One User Data
		app.post('/order/byemail', async (req, res) => {
			const email = req.body;
			const query = { email: { $in: email } };
			const orders = await orderCollection.find(query).toArray();
			res.send(orders);
		});
		//*POST Order
		app.post('/order', async (req, res) => {
			const order = req.body;
			const result = await orderCollection.insertOne(order);
			res.send(result);
		});
		//*POST A new user in user collection
		app.post('/users', async (req, res) => {
			const user = req.body;
			const result = await userCollection.insertOne(user);
			console.log(result);
			res.json(result);
		});
		//*Put Google Login user in user collection
		app.put('/users', async (req, res) => {
			const user = req.body;
			const filter = { email: user.email };
			const options = { upsert: true };
			const updateDoc = { $set: user };
			const result = await userCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			res.json(result);
		});
		//*DELETE Single Order
		app.delete('/order/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await orderCollection.deleteOne(query);
			res.json(result);
		});
		//*DELETE Single Product
		app.delete('/products/:id', async (req, res) => {
			const id = req.params.id;
			const query = { _id: ObjectId(id) };
			const result = await productCollection.deleteOne(query);
			res.json(result);
		});
		//*Add a review
		app.post('/review', async (req, res) => {
			const review = req.body;
			const result = await reviewCollection.insertOne(review);
			res.send(result);
		});
		//*Add a new product
		app.post('/products', async (req, res) => {
			const product = req.body;
			const result = await productCollection.insertOne(product);
			res.send(result);
		});
		//*UPDATE Status
		app.put('/status/:id', async (req, res) => {
			const id = req.params.id;
			const filter = { _id: ObjectId(id) };
			const options = { upsert: true };
			const updateDoc = {
				$set: {
					status: 'shipped',
				},
			};
			const result = await orderCollection.updateOne(
				filter,
				updateDoc,
				options
			);
			console.log('Updating Users Status');
			res.json(result);
		});
		//* Check Admin
		app.get('/users/:email', async (req, res) => {
			const email = req.params.email;

			const query = { email: email };
			const user = await userCollection.findOne(query);
			let isAdmin = false;
			if (user?.role === 'admin') {
				isAdmin = true;
			}
			console.log(email);
			res.json({ admin: isAdmin });
		});
		// *Add Admin
		app.put('/users/admin', verifyToken, async (req, res) => {
			const user = req.body;
			const requester = req.decodedEmail;

			if (requester) {
				const requesterAccount = await userCollection.findOne({
					email: requester,
				});
				if (requesterAccount.role === 'admin') {
					const filter = { email: user.email };
					const updateDoc = { $set: { role: 'admin' } };
					const result = await userCollection.updateOne(
						filter,
						updateDoc
					);
					res.json(result);
				}
			} else {
				res.status(403).json({
					message: 'You do not have admin access.',
				});
			}
		});
	} finally {
		// await client.close();
	}
}
run().catch(console.dir);

app.get('/', (req, res) => {
	res.send('Running SpecsSphere Server');
});

app.listen(port, () => {
	console.log('Running SpecsSphere Server on port', port);
});
