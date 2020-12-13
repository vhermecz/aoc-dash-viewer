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

function calcDelta(ts, i) {
  if (!ts) {
    return;
  }
  const FIRST_DAY_TS = 1606798800;
  return (ts|0) - (FIRST_DAY_TS+86400*(i-1));
}

function formatDelta(value) {
  if (!value) {
    return;
  }
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

function compareFunction(a,b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}

function App() {
  const classes = useStyles();
  const [data, setData] = React.useState(null);
  const [sessionId, setSessionId] = React.useState("TBD");
  const [dashId, setDashId] = React.useState("TBD");
  const [orderBy, setOrderBy] = React.useState(null);
  const [users, setUsers] = React.useState([]);
  React.useEffect(() => {
    const read = async() => {
      //const resp = getApiData(sessionId, 0/*TBD*/);
      //setData(resp.data);
      setData(demodata);
    }
    read();
  }, [sessionId]);
  React.useEffect(() => {
    //if (orderBy === null)
    if (!data) {
      return;
    }
    let comparator = (a,b) => compareFunction(a.name, b.name);
    if (orderBy !== null) {
      function getStar(u, d, i) {
        const value = ((u.completion_day_level[d]||{})[i]||{}).get_star_ts|0;
        //console.log(u);
        //console.log([d, i, value])
        return value;
      }
      function getDelta(u, d) {
        const s1=getStar(u, d, 1);
        const s2=getStar(u, d, 2);
        if (s2===0) {
          return 1e20;
        }
        console.log([u,d,s1,s2,s2-s1]);
        return s2-s1;
      }
      comparator = (a,b) => compareFunction(getDelta(a, orderBy), getDelta(b, orderBy));
    }
    console.log(`sorting by ${orderBy}`);
    setUsers(Object.values(data["members"]).sort(comparator).map(x=>x.id))
  }, [data, orderBy]);
  const handleOrderBy = (idx) => {
    if (idx===orderBy) {
      setOrderBy(null);
    } else {
      setOrderBy(idx);
    }
  }

  if (!data) {
    return "No data";
  }
  const numDays = Math.max(
      ...Object.values(data["members"]).map(
          x => Object.keys(x["completion_day_level"]).length
      )
  );

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
            {users.map(uid =>
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
                <TableCell onClick={()=>handleOrderBy(i+1)}>{i+1}</TableCell>
                {users.map(uid => {
                  const dayData = data["members"][uid]["completion_day_level"][i+1] || {};
                  const star1ts = (dayData["1"]||{})["get_star_ts"];
                  const star2ts = (dayData["2"]||{})["get_star_ts"];
                  return (
                      <TableCell>
                        {false&&formatDelta(calcDelta(star1ts, i+1))}
                        {false&&formatDelta(calcDelta(star2ts, i+1))}
                        {star1ts && star2ts && formatDelta(star2ts-star1ts)}<br/>
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
