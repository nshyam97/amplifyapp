import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Auth, Amplify } from 'aws-amplify';
import AWSAppSyncClient, { AUTH_TYPE } from 'aws-appsync';
import awsconfig from './aws-exports';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import axios from 'axios';

const initialFormState = { name: '', description: '', bloodLevel: '' }

Amplify.configure(awsconfig);

const client = new AWSAppSyncClient({
  url: awsconfig.aws_appsync_graphqlEndpoint,
  region: awsconfig.aws_appsync_region,
  auth: {
    type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
    jwtToken: async () => (await Auth.currentSession()).getIdToken().getJwtToken(),
  },
});

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);

  const data = {
    'key1': 'value1',
    'key2': 'value2',
    'key3': 'value3'
  }

  useEffect(() => {
    getData();
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description || !formData.bloodLevel) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }

  async function getData() {
    setLoading(true);
    Auth.currentAuthenticatedUser()
      .then(user => {
        axios.post('https://gavwmj3myf.execute-api.us-east-2.amazonaws.com/dev/docker-function-resource', data, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': user.signInUserSession.idToken.jwtToken
          },
        })
        .then(res => {
          setLoading(false);
          const data = res.data;
          console.log({data})
        })
      })
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="Note description"
        value={formData.description}
      />
      <input
        onChange={e => setFormData({ ...formData, 'bloodLevel': e.target.value})}
        placeholder="Blood Level"
        value={formData.bloodLevel}
      />
      <button onClick={createNote}>Create Note</button>
      {loading ? <div>Loading Spinner here</div> : <div>Fully loaded</div>}
      <div style={{marginBottom: 30}}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);