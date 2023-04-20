const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3080;
const url = process.env.MONGO || 'mongodb://localhost:27017/';
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
const queryServer = async (name) => {
    try {
        let data = [];
        const response = await axios.get('https://csc.sunrust.org/public/servers/' + name);
        data = response.data;
        return data;
    } catch (error) {
        console.error(error);
    }
};

const updateServerDatabase = async () => {
    console.log('\nReplacing server database ' + new Date().toLocaleTimeString());
    // create a new MongoClient
    const client = new MongoClient(url, { useUnifiedTopology: true });
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(serverCollectionName);
        const data = await queryUrl();
        const serverData = [];
        for (const [key, value] of Object.entries(data)) {
            const serverShortName = value.ServerShortName;
            const cscServerData = await queryServer(serverShortName);
            const playerList = cscServerData.PlayerList;
            const teamList = cscServerData.TeamList;
            console.log(teamList)
            const server = {
                serverName: value.ServerName,
                serverShortName: value.ServerShortName,
                extraInfo: value.ExtraInfo,
                ip: value.IP,
                map: value.Map,
                playerCount: value.PlayerCount,
                maxPlayers: value.MaxPlayers,
                playerList: playerList,
                teamList: teamList,
                lastUpdated: new Date()
            };
            serverData.push(server);
        }
        await collection.deleteMany({});
        await collection.insertMany(serverData);
    } catch (error) {
        console.error(error);
    }
    finally {
        await client.close();
    }

};

const updateMapDatabase = async () => {
    console.log('Updating map database ' + new Date().toLocaleTimeString() + '\n');
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
        console.log("request for data on " + data.length + " servers completed")
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
        console.log("request for data on " + data.length + " maps completed")
    } catch (error) {
        console.error(error);
    }
});

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}\nUpdate interval: 1 minute\n`);
});