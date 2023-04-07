const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3080;
const url = 'mongodb://mongo:27017/';
const dbName = 'servers';
const serverCollectionName = 'server_data';
const mapCollectionName = 'map_data';


const queryUrl = async () => {
    try {
        const response = await axios.get('https://csc.sunrust.org/public/servers');
        const data = response.data;
        return data;
    } catch (error) {
        console.error(error);
    }
};

const updateServerDatabase = async () => {
    console.log('Updating server database' + new Date().toLocaleTimeString());
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(serverCollectionName);
        const data = await queryUrl();
        
        for (const [key, value] of Object.entries(data)) {
            const serverData = {
                serverShortName: value.ServerShortName,
                ip: value.IP,
                map: value.Map,
                playerCount: value.PlayerCount,
                maxPlayers: value.MaxPlayers,
                serverName: value.ServerName,
                extraInfo: value.ExtraInfo || ''
            };
            
            const query = { serverShortName: serverData.serverShortName };
            const update = { $setOnInsert: serverData };
            const options = { upsert: true };
      
            await collection.updateOne(query, update, options);
        }
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
};

const updateMapDatabase = async () => {
    console.log('Updating map database' + new Date().toLocaleTimeString());
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(mapCollectionName);
        const data = await queryUrl();

        for (const [key, value] of Object.entries(data)) {
            const mapData = {
                map: value.Map,
                playedBy: [
                    {
                        serverShortName: value.ServerShortName,
                        played: new Date()
                    }
                ],
                playedLast: new Date(),
                playedLastBy: value.ServerShortName
                //array of objects
            };
            //map and playedby
            const query = { map: mapData.map};
            const update = {
                $max: {
                  playedLast: mapData.playedLast,
                  playedLastBy: value.ServerShortName,
                },
                $addToSet: {
                  playedBy: {
                    serverShortName: value.ServerShortName
                  }
                },
              };              
            const options = { upsert: true };

            await collection.updateOne(query, update, options);
        }
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
};


// run these functions at startup to create the databases and collections
updateServerDatabase();
setInterval(updateServerDatabase, 60000);

updateMapDatabase();
setInterval(updateMapDatabase, 60000);

app.get('/serverdata', async (req, res) => {
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(serverCollectionName);
        const data = await collection.find().toArray();
        res.send(data);
    } catch (error) {
        console.error(error);
    } finally {
        await client.close();
    }
});

app.get('/mapdata', async (req, res) => {
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(mapCollectionName);
        const data = await collection.find().toArray();
        res.send(data);
    } catch (error) {
        console.error(error);
    }
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});