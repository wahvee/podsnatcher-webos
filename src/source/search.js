function Search() {
	// Events to be broadcast when the search results are in
	var finishedSearch = Mojo.Event.make(Search.SearchCompleted, {results: []});
	var searchError = Mojo.Event.make(Search.SearchError, {error: {}});

	// An object passed to the Template for the Digital Podcast URL
	// See http://www.digitalpodcast.com/podcastsearchservice/api_doc.html
	// for documentation
	var digitalPodcastParams = {
		appid: "wahvee-podsnatcher-for-webos",
		keywords: "",
		start: 0,
		results: 50,
		sort: "alpha",
		searchsource: "all",
		format: "rss",
		contentfilter: "nofilter"
	};

	// An object passed to the Template for the Spoken Word API.
	var spokenWordParams = {
		username: "wahvee",
		remoteKey: "04b194874f0e24b682d494e37285e8ac"
	};

	// The URL for Google's Listen API search.
	var googleUrl = "http://lfe-alpo-gm.appspot.com/search";
	var digitalPodcastSearchUrl = "http://www.digitalpodcast.com/podcastsearchservice/v2b/search/";
	var spokenWOrdUrl = "http://www.digitalpodcast.com/podcastsearchservice/v2b/search/";

	// The private array that all search results will be stored in
	var searchResults = $H();

	// Number of search providers
	var searchProviders = 2;

	// Number of search provider responses
	var searchProviderResponses = 0;

	/**
	 * @private
	 * Private method that performs the actual searching of Google's Listen
	 * Labs API. This is an undocumented API from Google so it could change
	 * in the future, and should not be considered the only option.
	 * @param keyword {String} The word to be searched for.
	 */
	var googleSearch = function(keyword) {
		Mojo.Log.info("[Search.googleSearch]");
		var request = new Ajax.Request(googleUrl, {
			method : "get",
			parameters: {
				q: keyword
			},
			evalJSON : "true",
			evalJS : "false",
			onFailure : function(transport) {
				// Log the response from the Google search
				searchProviderResponses++;
				// Create the error message
				Object.extend(searchError.error, {code: transport.status, message: "[Google Search] There was an error with the AJAX call."});
				// Log to the console
				Mojo.Log.error("[Search.googleSearch] HTTP Status %s", transport.status);
				// Notify through event that the search errored out
				Mojo.Controller.stageController.sendEventToCommanders(searchError);
			},
			onSuccess : googleSearchResults
		});
	};

	/**
	 * @private
	 * Private method that gets the results from the search finishing.
	 */
	var googleSearchResults = function(transport) {
		// Log the response from the Google search
		searchProviderResponses++;
		// Check that the response is a good one
		if(transport && transport.responseJSON && transport.status >= 200 && transport.status < 300) {
			var json = transport.responseJSON;
			// Loop through all of the items and add them to the list
			json.items.each(function(item) {
				// Create a unique id for this result item
				var hashID = hex_md5(item.feed_url);
				// Add the unique item to the results list.
				// Note: duplicates will be automatically overwritten, see Hash documentation
				searchResults.set(hashID, {
					title: item.feed_title,
					url: item.feed_url,
					image: item.image_href,
					date: item.date
				});
			});
			// Trigger the event that search is complete
			sendCompletedEvent();
		} else {
			// Create the error message
			Object.extend(searchError.error, {code: transport.status, message: "[Google Search] There was an error with the AJAX call."});
			// Log the error to the console
			Mojo.Log.error("[Search.googleSearchResults] HTTP Status %s", transport.status);
			// Notify through event that the search errored out
			Mojo.Controller.stageController.sendEventToCommanders(searchError);
		}
	};

	/**
	 * @private
	 * Private method that sets up and performs the search for podcasts
	 * using the Digital Podcast API.
	 * @param keywords {String}
	 */
	var digitalPodcastSearch = function(keywords) {
		// Set the keywords to be searched
		digitalPodcastParams.keywords = keywords;
		Mojo.Log.info("[Search.digitalPodcastSearch]");
		var request = new Ajax.Request(digitalPodcastSearchUrl, {
			method : "get",
			parameters: digitalPodcastParams,
			evalJSON : "true",
			evalJS : "false",
			onFailure : function(transport) {
				// Log the response from the Digital Podcast search
				searchProviderResponses++;
				// Create the error message
				Object.extend(searchError.error, {code: transport.status, message: "[Digital Podcast Search] There was an error with the AJAX call."});
				// Log the error
				Mojo.Log.error("[Search.digitalPodcastSearch] HTTP Status %s", transport.status);
				// Notify through event that the search errored out
				Mojo.Controller.stageController.sendEventToCommanders(searchError);
			},
			onSuccess : digitalPodcastSearchResults
		});
	};

	/**
	 * @private
	 *
	 */
	var digitalPodcastSearchResults = function(transport) {
		// Log the response from the Digital Podcast search
		searchProviderResponses++;
		// Check that the response is a good one
		if(transport && transport.responseXML && transport.status >= 200 && transport.status < 300) {
			// Make the PFeed run in linear mode
			var result = new PFeed(false);
			// Parse the XML as RSS
			var isRSS = result.parse(transport.responseXML);
			// Check to see if the XML was infact RSS
			if(isRSS) {
				// Now loop through each result and add it to the array
				result.items.values().each(function(item) {
					// Create a unique id for this result item
					var hashID = hex_md5(item.source);
					// Add the unique item to the results list.
					// Note: duplicates will be automatically overwritten, see Hash documentation
					searchResults.set(hashID, {
						title: item.title,
						url: item.source,
						date: item.published
					});
				});
			} else {
				// Get the error message
				var error = new SearchXmlError(transport.responseXML);
				// Add the results to the response...
				Object.extend(searchError.error, {code: 1, message: "[Digital Podcast Search] " + error.Message()});
				// Notify through event that the search errored out
				Mojo.Controller.stageController.sendEventToCommanders(searchError);
			}
			// Trigger the event that search is complete
			sendCompletedEvent();
		} else {
			// Create the error message
			Object.extend(searchError.error, {code: transport.status, message: "[Digital Podcast Search] There was an unhandled exception by the search server."});
			// Log to the console
			Mojo.Log.error("[Search.digitalPodcastSearchResults] HTTP Status %s", transport.status);
			// Notify through event that the search errored out
			Mojo.Controller.stageController.sendEventToCommanders(searchError);
		}
	};

	/**
	 * @private
	 * Method actually triggers the event that the search has completed, it
	 * also adds the results to the event.
	 */
	var sendCompletedEvent = function() {
		if(searchProviders <= searchProviderResponses) {
			// Add the results to the response...
			Object.extend(finishedSearch.results, searchResults.values());
			// Notify through event that search is completed
			Mojo.Controller.stageController.sendEventToCommanders(finishedSearch);
		}
	}

	/**
	 * Method to actually perform the search functionality. It will be passed
	 * the keyword to be searched on. It will then check all of the providers
	 * that are available. The response is listened for by and event named
	 * Search.SearchCompleted or Search.SearchError depending on the outcome
	 * of the search.
	 * @param keywords {String} The keywords to search on.
	 */
	this.search = function(keywords) {
		// Number of search providers
		searchProviders = 2;
		// Number of search provider responses
		searchProviderResponses = 0;
		// Reset the search results
		searchResults = $H();
		googleSearch(keywords);
		digitalPodcastSearch(keywords);
	};
};

Search.SearchCompleted = 'onSearchComplete';
Search.SearchError = 'onSearchError';
