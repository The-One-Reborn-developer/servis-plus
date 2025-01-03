import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

// Import routes
import servicesRouter from "./routes/services.mjs";
import commonRouter from "./routes/common.mjs";
import deliveryRouter from "./routes/delivery.mjs";

// Import websocket server
import { setupWebsocketServer } from "./modules/common_index.mjs";

// Import database creation functions
import {
    createUsersTable,
    createBidsTable,
    createDeliveriesTable,
    createServicesResponsesTable,
    createDeliveriesResponsesTable
} from "./modules/common_index.mjs";


dotenv.config({ path: '/app/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('./app/database.db', { verbose: console.log });

const app = express();
app.use(express.json());
app.use(express.static('app/public'));

const servicesAttachmentPath = path.join(__dirname, '../chats/services/attachments');
const deliveryAttachmentPath = path.join(__dirname, '../chats/delivery/attachments');
const courierPhotos = path.join(__dirname, '../photos/courier_photos');
app.use('/services/attachments', express.static(servicesAttachmentPath));
app.use('/delivery/attachments', express.static(deliveryAttachmentPath));
app.use('/photos/courier_photos', express.static(courierPhotos));
console.log(`Serving attachments from ${servicesAttachmentPath}, ${deliveryAttachmentPath}`);
console.log('Express app created');

app.use('/common', commonRouter);
app.use('/services', servicesRouter);
app.use('/delivery', deliveryRouter);

const httpServer = createServer(app);
const { sendMessageToUser } = setupWebsocketServer(httpServer);
const PORT = process.env.PORT || 3000;

createUsersTable(db);
createBidsTable(db);
createDeliveriesTable(db);
createServicesResponsesTable(db);
createDeliveriesResponsesTable(db);


app.get('/', (req, res) => {
    res.sendFile('app/public/views/index.html', { root: './' });    
});


// 404 Route
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});


// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Unexpected server error.' });
});


httpServer.listen(PORT, () => {
    console.log(`HTTPS server started on port ${PORT}`);
});
