const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send("Hello World – Dynamic Website!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on " + port));

