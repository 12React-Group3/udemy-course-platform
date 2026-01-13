const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 5000

// import routers



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

// use Routers as middleware
// app.use('/api/auth',authRoutes)
// app.use('/api/courses',courseRoutes)
// app.use('/api/tasks',taskRoutes)
// app.use('/api/questions',questionRoutes)



// 404 route handler
app.use((req,res)=>{
    res.status(404).json({
        success:false,
        error:'Route node found',
        statusCode:404
    });
});


// start the server
app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`Backend listening on http://localhost:${port}`)
})
