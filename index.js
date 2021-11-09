const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
	res.send('Running SpecsSphere Server');
});

app.listen(port, () => {
	console.log('Running SpecsSphere Server on port', port);
});
