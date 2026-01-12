const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 5000

app.use(
	cors({
		origin: ['http://localhost:5173'],
	}),
)
app.use(express.json())

app.get('/api/hello', (req, res) => {
	res.json({
		message: 'Hello from Node backend!',
		serverTime: new Date().toISOString(),
	})
})

app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`Backend listening on http://localhost:${port}`)
})
