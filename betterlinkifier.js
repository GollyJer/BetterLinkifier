// ==UserScript==
// @id              LinkifyWithjQuery@gollyjer.com
// @name      jLinkifyTEST
// @version         1.0
// @namespaces      gollyjer.com
// @author          Jeremy Gollehon
// @description   
// @include         http://www.gqueues.com/*
// @include         http://yellow5.us/firefox/testcases.txt
// @include         http://daringfireball.net/*
// @require         http://code.jquery.com/jquery-latest.min.js
// @run-at          document-end


//Matchers

NodeRegexMatcher = (function() {
  function NodeRegexMatcher(pattern) {
    this.pattern = pattern;
  }

  NodeRegexMatcher.prototype.getMatches = function(node) {
    if(!isTextNode(node))
      return [];

    $(node).empty();

    var matches = [];
    var jqueryNode = $(node);
    var textToSearch = node.nodeValue;
    var indexAfterPreviousMatch = 0;
    match = textToSearch.match(this.pattern);

    var anyMatches = match;
    if(anyMatches) {
      node.nodeValue = '';
    }

    while(match) {
      var indexOfMatch = indexAfterPreviousMatch + match.index;
      var nodeOfMatch = $(document.createTextNode(match[0]));
      var nodeBeforeMatch = document.createTextNode(textToSearch.substring(indexAfterPreviousMatch, indexOfMatch));

      jqueryNode.before(nodeBeforeMatch);
      jqueryNode.before(nodeOfMatch);

      matches.push({
        'node' : nodeOfMatch,
        'matchedText' : match[0],
        'matchParts' : match.slice(1)
       });

      indexAfterPreviousMatch += match.index + match[0].length;
      match = textToSearch.substring(indexAfterPreviousMatch).match(this.pattern);
    }

    if(anyMatches) {
        var nodeBeforeMatch = document.createTextNode(textToSearch.substring(indexAfterPreviousMatch));
        jqueryNode.before(nodeBeforeMatch); 
    }

    return matches;
  };

  return NodeRegexMatcher;
})();

NotChildOfAnchorMatcher = (function() {
  function NotChildOfAnchorMatcher(matcher) {
    this.matcher = matcher;
  }

  NotChildOfAnchorMatcher.prototype.getMatches = function(node) {
    if(!this.isChildOfAnchor(node))
      return [];

    return this.matcher.getMatches(node);
  }

  NotChildOfAnchorMatcher.prototype.isChildOfAnchor = function(node) {
    return $(node).parents('a').length === 0;
  }

  return NotChildOfAnchorMatcher;
})();

FilterMatcher = (function() {
  function FilterMatcher(matcher, filter) {
    this.matcher = matcher;
    this.filter = filter;
  }
  
  FilterMatcher.prototype.getMatches = function(node) {
    var matches = this.matcher.getMatches(node);

    var $this = this;
    return matches.filter(function(match, index, array) {
      return $this.filter.isMatch(match, index, array);
    });
  };

  return FilterMatcher;
})();

//Matches

IsNotMatch = (function() {
  function IsNotMatch(match) {
    this.match = match;
  }

  IsNotMatch.prototype.isMatch = function(match, index, array) {
    return !this.match.isMatch(match, index, array);
  };

  return IsNotMatch;
})();

IsProtocolMatch = (function() {
  function IsProtocolMatch() { };

  IsProtocolMatch.prototype.isMatch = function(match, index, array) {
    return this.hasProtocol(match, index, array) || this.isMailto(match, index, array);
  };

  IsProtocolMatch.prototype.hasProtocol = function(match, index, array) {
    var indexOfFirstColon = match.matchedText.indexOf(':');

    return match.matchedText.substring(indexOfFirstColon, indexOfFirstColon + 3) === '://';
  };

  IsProtocolMatch.prototype.isMailto = function(match, index, array) {
    var indexOfFirstColon = match.matchedText.indexOf(':');

    return match.matchedText.substring(0, indexOfFirstColon + 1) === 'mailto:';
  };

  return IsProtocolMatch;
})();

//Linkifiers

Linkifier = (function() {
  function Linkifier(matcher, linkify) {
    this.matcher = matcher;
    this.linkify = linkify;
  }

  Linkifier.prototype.linkifyNode = function(node) {
    var $this = this;
    this.matcher.getMatches(node).forEach(function(match) {
      $this.linkify.linkifyMatch(match);
    });
  };

  return Linkifier;
})();

UrlWithProtocolNodeLinkifier = (function() {
  function UrlWithProtocolNodeLinkifier() { }

  UrlWithProtocolNodeLinkifier.prototype.linkifyMatch = function(match) {
    match.node.replaceWith($("<a>").attr("href", match.node.text()).html(match.node.clone()));
  };

  return UrlWithProtocolNodeLinkifier;
})();

UrlWithoutProtocolNodeLinkifier = (function() {
  function UrlWithoutProtocolNodeLinkifier() { }

  UrlWithoutProtocolNodeLinkifier.prototype.linkifyMatch = function(match) {
    match.node.replaceWith($("<a>").attr("href", "http://" + match.node.text()).html(match.node.clone()));
  };

  return UrlWithoutProtocolNodeLinkifier;
})();

TwitterNodeLinkifier = (function() {
  function TwitterNodeLinkifier() { }

  TwitterNodeLinkifier.prototype.linkifyMatch = function(match) {
    //Must put the possible whitespace matched in before replacing the matched node
    match.node.before(match.matchParts[0]);
    match.node.after(match.matchParts[2]);
    match.node.replaceWith($("<a>").attr("href", "https://twitter.com/" + match.matchParts[1]).html(match.matchParts[1]));
  };

  return TwitterNodeLinkifier;
})();

function isTextNode(node) {
  return node.nodeType === 3;
}

function anotherisTextNode() {
  return this.nodeType === 3;
}

function descendantNodes( node ) {
  return $(node).add("*", node).contents();
}

  
var urlMatcher = new NotChildOfAnchorMatcher(new NodeRegexMatcher(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:"".,<>?«»“”‘’]))/i));

var urlWithProtocolMatcher = new FilterMatcher(urlMatcher, new IsProtocolMatch());
var urlWithProtocolLinkifier = new Linkifier(urlWithProtocolMatcher, new UrlWithProtocolNodeLinkifier());

var urlWithoutProtocolMatcher = new FilterMatcher(urlMatcher, new IsNotMatch(new IsProtocolMatch()));
var urlWithoutProtocolLinkifier = new Linkifier(new NotChildOfAnchorMatcher(urlWithoutProtocolMatcher), new UrlWithoutProtocolNodeLinkifier());

var twitterMatcher = new NodeRegexMatcher(/(^|[^@\w])([@#]\w{1,15})(\s)\b/i);
var twitterLinkifier = new Linkifier(twitterMatcher, new TwitterNodeLinkifier());

var linkifiers = [
  urlWithProtocolLinkifier,
  urlWithoutProtocolLinkifier,
  twitterLinkifier
];

linkifiers.forEach(function(linkifier) {
  $.each(descendantNodes($("body")).filter(anotherisTextNode), function(i, node) {
    linkifier.linkifyNode(node);
  });
});