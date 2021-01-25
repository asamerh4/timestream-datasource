import { e2e } from '@grafana/e2e';

// @todo this actually returns type `Cypress.Chainable`
const addMongoDBDataSource = (connection: string, user: string, password: string): any => {
  const fillCommonField = (name: string, newValue: string) =>
    e2e()
      .get('form')
      .find(`input[name='${name}']`)
      .scrollIntoView()
      .type(newValue);

  const toggle = (name: string) =>
    e2e()
      .get('form')
      .find(`[id='${name}']`)
      .scrollIntoView()
      .click();

  return e2e.flows.addDataSource({
    checkHealth: true,
    expectedAlertMessage: 'OK',
    form: () => {
      toggle('cred-label');
      fillCommonField('connection', connection);
      fillCommonField('user', user);
      fillCommonField('password', password);
    },
    type: 'MongoDB',
  });
};

const addMongoDBPanel = (query: string) => {
  const fillQuery = () =>
    e2e()
      .get('.monaco-editor textarea')
      .scrollIntoView()
      // @todo https://github.com/cypress-io/cypress/issues/8044
      .type(Cypress.platform === 'darwin' ? '{cmd}a' : '{ctrl}a')
      .type('{backspace}')
      .then($elm => {
        // `.type()` caused issues with autocomplete and template variables
        // @todo fix weird whitespace issues caused by this approach
        const event = new Event('input', { bubbles: true, cancelable: true });
        const textarea = $elm.get(0) as HTMLTextAreaElement;
        textarea.value = query;
        textarea.dispatchEvent(event);
      })
      .type(Cypress.platform === 'darwin' ? '{cmd}s' : '{ctrl}s');

  // This gets auto-removed within `afterEach` of @grafana/e2e
  e2e.flows.addPanel({
    matchScreenshot: true,
    queriesForm: () => {
      e2e.components.QueryEditorRows.rows().within(() => fillQuery());
    },
  });
};

e2e.scenario({
  describeName: 'Smoke tests',
  itName: 'Login, create data source, dashboard and panel',
  scenario: () => {
    e2e()
      .readProvisions([
        // Paths are relative to <project-root>/provisioning
        'datasources/mongodb.yaml',
      ])
      .then(([provision]) => {
        const datasource = provision.datasources[0];
        // This gets auto-removed within `afterEach` of @grafana/e2e
        return addMongoDBDataSource(
          datasource.jsonData.connection,
          datasource.jsonData.user,
          datasource.secureJsonData.password
        );
      })
      .then(() => {
        // This gets auto-removed within `afterEach` of @grafana/e2e
        e2e.flows.addDashboard({
          timeRange: {
            from: '2001-01-31 19:00:00',
            to: '2016-01-31 19:00:00',
          },
        });
        const query = "SHOW TABLES";

        // This gets auto-removed within `afterEach` of @grafana/e2e
        addMongoDBPanel(query);
      });
  },
});
