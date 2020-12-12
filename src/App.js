import React from 'react';
import './App.css';
import axios from 'axios';
import {Box, Grid, Table, TextField, TableRow, TableCell} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import fetch from 'node-fetch';
import {demodata} from "./demodata";

const useStyles = makeStyles(theme => ({
  vText: {
    height: 140,
    whiteSpace: 'nowrap',
    '& div': {
      transform: 'translate(25px, 51px) rotate(315deg)',
      width: 30,
      '& span': {
        borderBottom: "1px solid #ccc",
        padding: "5px 10px",
      }
    }
  },
}));

function formatDDHHMMSS(delta) {
  const signStr = delta<0?"-":"";
  delta = Math.abs(delta);
  const sec = delta % 60;
  const min = Math.floor(delta / 60) % 60;
  const hour = Math.floor(delta / 3600) % 24;
  const day = Math.floor(delta / 86400);
  const hasDay = day !== 0;
  const hasHour = hasDay || hour !== 0;
  const hasMin = hasHour || min !== 0;
  return signStr +
      (!hasDay ? '' : String(day) + 'd') +
      (!hasHour ? '' : String(hour).padStart(hasDay ? 2 : 1, '0') + 'h') +
      (hasDay || !hasMin ? '' : String(min).padStart(hasHour ? 2 : 1, '0') + 'm') +
      (hasHour ? '' : String(sec).padStart(hasMin ? 2 : 1, '0') + 's');
}

function formatTs(ts, i) {
  if (!ts) {
    return;
  }
  const FIRST_DAY_TS = 1606798800;
  const value = (ts|0) - (FIRST_DAY_TS+86400*(i-1));
  return formatDDHHMMSS(value);
}

async function getApiData(sessionId, dashboardId) {
  // FIXME: Clean up request
  return fetch(`https://adventofcode.com/2020/leaderboard/private/view/${dashboardId}.json`, {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en,en-US;q=0.9,hu;q=0.8,fr;q=0.7",
      "cache-control": "max-age=0",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": `session=${sessionId}`
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET",
    "mode": "cors"
  });
}

function App() {
  const classes = useStyles();
  const [data, setData] = React.useState(null);
  const [sessionId, setSessionId] = React.useState("TBD");
  const [dashId, setDashId] = React.useState("TBD");
  React.useEffect(() => {
    const read = async() => {
      //const resp = getApiData(sessionId, 0/*TBD*/);
      //setData(resp.data);
      setData(demodata);
    }
    read();
  }, [sessionId]);

  if (!data) {
    return "No data";
  }
  const numDays = Math.max(
      ...Object.values(data["members"]).map(
          x => Object.keys(x["completion_day_level"]).length
      )
  );
  const userIds = Object.keys(data["members"]);

  return (
      <Box p={2}>
        <Grid container>
          <Grid item xs={9}>
            <TextField
                fullWidth
                label="Session ID"
                value={sessionId}
                onChange={(e)=>setSessionId(e.target.value)}
            />
          </Grid>
          <Grid item xs={3}>
            <TextField
                fullWidth
                label="Dashboard ID"
                value={dashId}
                onChange={(e)=>setDashId(e.target.value)}
            />
          </Grid>
        </Grid>
        <Table style={{width:'auto'}}>
          <TableRow>
            <TableCell>AOC</TableCell>
            {userIds.map(uid =>
                <TableCell class={classes.vText}>
                  <Box>
                    <span>
                      {data["members"][uid]["name"]}
                    </span>
                  </Box>
                </TableCell>
            )}
          </TableRow>
          {[...Array(numDays)].map((_, i) =>
              <TableRow>
                <TableCell>{i+1}</TableCell>
                {userIds.map(uid => {
                  const dayData = data["members"][uid]["completion_day_level"][i+1] || {};
                  const star1ts = (dayData["1"]||{})["get_star_ts"];
                  const star2ts = (dayData["2"]||{})["get_star_ts"];
                  return (
                      <TableCell>
                        {formatTs(star1ts, i+1)}<br/>
                        {formatTs(star2ts, i+1)}
                      </TableCell>
                  )}
                )}
              </TableRow>
          )}
        </Table>
      </Box>
 );
}

export default App;
