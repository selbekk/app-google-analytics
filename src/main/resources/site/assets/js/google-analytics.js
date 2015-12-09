function getDocument(script) {
    return script ? script.ownerDocument : document;
}

function getCurrentScript() {
    var script = window.HTMLImports ? window.HTMLImports.currentScript : undefined;

    if (!script && !!document.currentScript) {
        script = document.currentScript.__importElement || document.currentScript;
    }

    return script;
}

var gaScript = getCurrentScript();
var gaDocument = getDocument(gaScript);
var serviceUrl = gaScript.getAttribute('serviceurl');
var trackingId = gaScript.getAttribute('trackingid');
var uid = gaDocument.baseURI.split('?uid=')[1];

function getContainer(containerId) {
    containerId = containerId + "_" + uid;
    return document.getElementById(containerId) || gaDocument.getElementById(containerId);
}

function setContainerVisible(containerId, visible) {
    var container = getContainer(containerId);
    if (container) {
        container.hidden = !visible;
    }

    return container;
}

function showAuthenticationError(errorMessage) {
    setContainerVisible('ga-not-authenticated', true).innerHTML = "Authentication failed" + (errorMessage ? ": " + errorMessage : "");
    setContainerVisible('ga-authenticated', false);
}

function showError(errorMessage) {
    setContainerVisible('ga-not-authenticated', true).innerHTML = "Error: " + errorMessage;
    setContainerVisible('ga-authenticated', false);
}

function queryAccounts() {
    gapi.client.analytics.management.accounts.list().then(handleAccounts);
}

function getPropertyUrl(accountId, propertyId) {
    gapi.client.analytics.management.webproperties.get({
        'accountId': accountId,
        'webPropertyId': propertyId
    }).then(function(response) {
        setTitle(response.result.name);
    });
}

function handleAccounts(response) {
    // Handles the response from the accounts list method.
    if (response.result.items && response.result.items.length) {
        // Get the first Google Analytics account.
        var firstAccountId = response.result.items[0].id;

        // Uncomment if we need to show url for selected tracking Id
        //getPropertyUrl(firstAccountId, trackingId);

        // Query for properties.
        queryProfiles(firstAccountId, trackingId);
    } else {
        showError('No accounts found for the user.');
    }
}

function showRequestError(errorObject) {
    if (errorObject.error && errorObject.error.message) {
        showError(errorObject.error.message);
    }
}

function queryProfiles(accountId, propertyId) {
    // Get a list of all Views (Profiles) for the first property
    // of the first Account.
    gapi.client.analytics.management.profiles.list({
        'accountId': accountId,
        'webPropertyId': propertyId
    })
        .then(handleProfiles)
        .then(null, function(err) {
            // Log any errors.
            console.log(err);
            showRequestError(err.result);
        });
}


function handleProfiles(response) {
    // Handles the response from the profiles list method.
    if (response.result.items && response.result.items.length) {
        // Get the first View (Profile) ID.
        var viewId = response.result.items[0].id;

        // Show statistics for found View ID
        showStatistics("ga:" + viewId);
    } else {
        showError('No views (profiles) found for the user.');
    }
}

function getToken() {
    if (!serviceUrl) {
        showAuthenticationError();
        return;
    }
    if (!trackingId) {
        showAuthenticationError("Tracking Id not found");
        return;
    }

    var request = new XMLHttpRequest();
    request.open("GET", serviceUrl, true);
    request.onload = function (){
        var responseObject = JSON.parse(request.responseText);
        if (responseObject.errorMessage) {
            showAuthenticationError(responseObject.errorMessage);
        }
        else if (responseObject.token) {
            setContainerVisible('ga-authenticated', true);
            setContainerVisible('ga-not-authenticated', false);

            authorize(responseObject.token);
        }
    };
    request.send(null);
}

function authorize(token) {
    /**
     * Authorize the user with a token.
     */
    gapi.analytics.auth.authorize({
        serverAuth: {
            access_token: token
        }
    });

    queryAccounts();
}

function showStatistics(viewId) {
    /**
     * Line chart by sessions
     */
    var dataChart1 = new gapi.analytics.googleCharts.DataChart({
        query: {
            ids: viewId,
            metrics: 'ga:sessions',
            dimensions: 'ga:date',
            'start-date': '30daysAgo',
            'end-date': 'yesterday'
        },
        chart: {
            container: getContainer("chart-container-1"),
            type: 'LINE',
            options: {
                title: 'Traffic by Date',
                width: '100%'
            }
        }
    });

    /**
     * Top 10 pages with the most pageviews
     */
    var dataChart2 = new gapi.analytics.googleCharts.DataChart({
        query: {
            ids: viewId,
            metrics: 'ga:uniquePageviews',
            dimensions: 'ga:pagePath',
            'start-date': '30daysAgo',
            'end-date': 'yesterday',
            'max-results': 12,
            'sort': '-ga:uniquePageviews'
        },
        chart: {
            container: getContainer("chart-container-2"),
            type: 'PIE',
            options: {
                is3D: true,
                width: "100%",
                height: "100%",
                title: "Top Pages"
            }
        }
    });

    /**
     * Column chart by users/new users
     */
    var dataChart3 = new gapi.analytics.googleCharts.DataChart({
        query: {
            ids: viewId,
            metrics: 'ga:users,ga:newUsers',
            dimensions: 'ga:date',
            'start-date': '30daysAgo',
            'end-date': 'yesterday'
        },
        chart: {
            container: getContainer("chart-container-3"),
            type: 'COLUMN',
            options: {
                title: 'Users by Date',
                bar: { groupWidth: '75%' },
                isStacked: true,
                width: '100%'
            }
        }
    });


    /**
     * Bar chart by countries
     */
    var dataChart4 = new gapi.analytics.googleCharts.DataChart({
        query: {
            ids: viewId,
            metrics: 'ga:users',
            dimensions: 'ga:country',
            'start-date': '30daysAgo',
            'end-date': 'yesterday'
        },
        chart: {
            container: getContainer("chart-container-4"),
            type: 'GEO',
            options: {
                width: '100%'
            }
        }
    });

    /**
     * Pie chart by referer
     */
    var dataChart5 = new gapi.analytics.googleCharts.DataChart({
        query: {
            ids: viewId,
            metrics: 'ga:users',
            dimensions: 'ga:source',
            'start-date': '30daysAgo',
            'end-date': 'yesterday',
            'max-results': 10,
            'sort': '-ga:users'
        },
        chart: {
            container: getContainer("chart-container-5"),
            type: 'TABLE',
            options: {
                width: '100%',
                height: "100%"
            }
        }
    });


    dataChart1.execute();
    dataChart2.execute();
    dataChart3.execute();
    dataChart4.execute();
    dataChart5.execute();
}

if (gapi.analytics.auth) {
    getToken();
}
else {
    gapi.analytics.ready(function () {
        getToken();
   });
}