$(document).ready(function() {
  try {
    bzhome.templates = {
      bugEvents: Handlebars.compile($("#bug-events").html()),
      timelineBug: Handlebars.compile($("#timeline-bug").html())
    }
  } catch(e) {
    console.error(e);
  }
  var id=0;

  function insertTeamTable(index, people) {
    var root = $("table.dynatable");
    var prot = root.find(".template").clone();

    prot.attr("class", "person");
    prot.attr("id", "person"+index);
    $("#teamtable").append(prot);
    //$("# td>input")
    if (people) {
      $("#person"+id).find("td>input").val(people);
      $("#person"+id).find("td>input").focus();
    } else {
      $("#person"+id).find("td>input").val("");
      $("#person"+id).find("td>input").focus();
    }
  };

  function initTeamTable() {
    var team = ["howareyou322@gmail.com", "mtseng@mozilla.com",
                "hshih@mozilla.com", "ethlin@mozilla.com",
                "vliu@mozilla.com", "dmu@mozilla.com",
                "kechen@mozilla.com", "cleu@mozilla.com", "brsun@mozilla.com"];

    for(var i=0; i < team.length; i++) {
      id++;
      insertTeamTable(id, team[i]);
    }
  };

  initTeamTable();

  $("table.dynatable button.add").click(function() {
    id++;
    insertTeamTable(id, null);

    console.log("button add is clicked");
    $("#teamtable tr.person td>input").focus();
  });

  //TODO debug here
  $("#teamtable tr.person td.name").click(function() {
    console.log("person is clicked");
    console.log($(this).find("input").val());
    $("#login-name").val($(this).find("input").val());
    $("#login-name").submit();
    console.log("finish input and trigger bugzilla query");

  });

  // Remove button functionality
  $("table.dynatable button.remove").click(function() {
    if (id) {
      $("#teamtable tr.person:last-child").remove();
      id--;
    }
  });

  /* timeline types */
  bzhome.components.forEach(function(comp) {
    var name = bzhome.componentName(comp),
        id = bzhome.componentId(comp);

    $("<option value='" + id + "' title='" + name + "'>"
      + comp.component + "</option>").prependTo("#component-types");

    $("<div class=type-section></div>").attr("id", id).insertAfter($("#all"));
  });

  $("#add-comp-form").hide();
  $("#timeline-type").change(function() {
    var type = $(this).val();
    if (type == "add") {
      $("#add-comp-form").show();
      // this does something terrible to autocomplete
      //$("#new-component").get(0).focus();
      return;
    }
    bzhome.showSection(type);
  });
  $("#timeline-type").val(bzhome.showing).change();

  $("#add-comp-form").submit(function(event) {
    event.preventDefault();

    $(this).hide();
    bzhome.addComponent($("#new-component").val());
  });

  /* save the user info to localStorage and populate data */
  bzhome.login();
  console.log("logged in");

  var input = $("#login-name");
  input.val(bzhome.email);

  input.blur(function() {
    var email = input.val();
    if (email) {
      if (typeof bzhome.user != 'undefined' && email != bzhome.email) {
        console.log(email);
        console.log(bzhome.email);
        console.log("email is changed, stop query");
        bzhome.user.stopquery();
        delete bzhome.user;

        setTimeout(function(){
          bzhome.login(email);
        }, 2000);
      } else {
        bzhome.login(email);
      }
    }
  });

  $("#login-form").submit(function(event) {
    // when the user presses "Enter" in login input
    event.preventDefault();
    input.blur();

    //var searchlist = new SearchList;
//    var reviewlist = new ReviewList;
//    var feedbacklist = new FeedbackList;
//    var superreviewlist = new SuperReviewList;
//    var needinfoList = new NeedInfoList;
  });

  $("#file-form").submit(function(event) {
    event.preventDefault();

    var nodestruct = bzhome.toComponent($("#file-form .component-search").val());
    var product = nodestruct[0],
        component = nodestruct[1];

    window.open(bzhome.base + "/enter_bug.cgi?"
                + "product=" + encodeURIComponent(product) + "&"
                + "component=" + encodeURIComponent(component));
  });

  $("#search-form").submit(function(event) {
    event.preventDefault();

    var string = $("#search-string").val();
    var url = bzhome.base + "/buglist.cgi?"
          + "query_format=advanced"
          + "&order=changeddate%20DESC";

    if (string) {
      url += "&short_desc_type=allwordssubstr&short_desc=" + encodeURIComponent(string)
        + "&longdesc_type=allwordssubstr&longdesc=" + encodeURIComponent(string);
    }
    if (component) {
      var nodestruct = bzhome.toComponent($("#search-form .component-search").val());
      var product = nodestruct[0],
          component = nodestruct[1];

      url += "&product=" + encodeURIComponent(product)
        + "&component=" + encodeURIComponent(component);
    }

    var open = $("#search-open").is(":checked"),
        closed = $("#search-closed").is(":checked");

    if (open && !closed) {
      url += bzhome.openUrl;
    }
    else if (closed && !open) {
      url += bzhome.closedUrl;
    }
    window.open(url);
  });
  
  $("#search-bugs").hide();
  $("#searches").hide();
  
  //var searchlist = new SearchList;
  var reviewlist = new ReviewList;
  var feedbacklist = new FeedbackList;
  var superreviewlist = new SuperReviewList;
  var needinfoList = new NeedInfoList;
});

var bzhome = {
  bugLimit: 20,

  base: "https://bugzilla.mozilla.org",

  openStatus: ["REOPENED", "NEW", "ASSIGNED", "UNCONFIRMED"],
  
  closedStatus: ["RESOLVED", "VERIFIED"],
  
  statusUrl: function(statuses) {
    var string = "";
    for (var i = 0; i < statuses.length; i++) {
      string += "&bug_status=" + statuses[i];
    }
    return string;     
  },
  
  get openUrl() {
    return bzhome.statusUrl(bzhome.openStatus);
  },
  
  get closedUrl() {
    return bzhome.statusUrl(bzhome.closedStatus);
  },
  
  get email() {
    return localStorage['bzhome-email'];
  },

  login : function(email) {
    if (!email) {
      email = utils.queryFromUrl()['user'];
      if (!email) {
        email = bzhome.email; // in localStorage
        if (!email) {
          $("#login-name").addClass("logged-out");
          $("#content").hide();
          return;               
        }
      }
    }
    $("#login-name").removeClass("logged-out");

    localStorage['bzhome-email'] = email;
    bzhome.user = new User(email, bzhome.bugLimit);
    bzhome.populate();
    $("#content").show();
  },
  
  get showing() {
    return localStorage['bzhome-selected'] || "cced"; 
  },
  
  showSection : function(section) {
    $(".type-section").hide();
    $("#" + section).show();

    localStorage['bzhome-selected'] = section;
  },
  
  get components() {
    return JSON.parse(localStorage["bzhome-components"] || '[]')
  },

  addComponent : function(name) {
    var nodestruct = bzhome.toComponent(name);
    var comp = {
      product: nodestruct[0],
      component: nodestruct[1]
    };
    var id = bzhome.componentId(comp);

    var components = bzhome.components.concat([comp])
    localStorage['bzhome-components'] = JSON.stringify(components);
    
    $("<div class=type-section></div>").attr("id", id).insertAfter("#all");
    bzhome.populateSections();
    
    $("<option value='" + id + "' title='" + name + "'>"
      + component + "</option>").prependTo("#component-types");
    $("#timeline-type").val(id).change();
  },
  
  componentName : function(comp) {
    return comp.product + "/" + comp.component; 
  },
  
  toComponent : function(name) {
    return name.split("/");  
  },

  componentId : function(comp) {
    // safe to use as an element id
    return comp.product.replace(/\W/g, "_") + "-" + comp.component.replace(/\W/g, "_");
  },

  populate : function() {
    bzhome.populateAutocomplete();

    bzhome.populateSections();
  },
  
  spinner : function(elem, inline) {
    var spinner = $("<img src='lib/indicator.gif' class='spinner'></img>");
    if (inline) {
      spinner.css({display: 'inline'});
    }
    elem.append(spinner);
  },
  
  isOpen : function(bug) {
    return bzhome.closedStatus.indexOf(bug.status) < 0 
  },

  populateSections : function() {
    $(".type-section").html("<img src='lib/indicator.gif' class='spinner'></img>");
    bzhome.fetchRecent();
  },
  
  fetchRecent : function() {     
    var recent = [];

    async.parallel([
      function(done) {
        bzhome.user.bugs(['cced'], function(err, bugs) {
          bzhome.populateTimeline("cced", bugs);

          recent = recent.concat(bugs);
          done();
        })
      },
      function(done) {
        bzhome.user.bugs(['assigned'], function(err, bugs) {
          bzhome.populateTimeline("assigned", bugs);

          recent = recent.concat(bugs);
          done();
        })
      },
      function(done) {
        async.forEach(bzhome.components, function(comp, done) {
          bzhome.user.component(comp.product, comp.component, function(err, bugs) {
            bzhome.populateTimeline(bzhome.componentId(comp), bugs);

            recent = recent.concat(bugs);
            done();
          })
        }, function(err) {
          done();
        })  
      },
    ], function(err) {
      // create "All" timeline after all bugs have been fetched
      bzhome.populateTimeline("all", recent);
    });
  },
  
  popuplateComponent : function(comp)  {
    bzhome.user.component(comp.product, comp.component, function(err, bugs) {
      bzhome.populateTimeline(bzhome.componentId(comp), bugs);

      recent = recent.concat(bugs);
      done();
    }) 
  },
  
  populateTimeline : function(type, bugs) {
    var element = $("#" + type);

    // remove duplicate bugs
    var unique = {};
    bugs.forEach(function(bug) {
      unique[bug.id] = bug;
    })
    bugs = _(unique).toArray();

    element.empty();
    
    bugs.sort(function(bug1, bug2) {
      return new Date(bug2.last_change_time) - new Date(bug1.last_change_time);
    })

    var html = "";
    for (var i = 0; i < bugs.length; i++) {
      html += bzhome.templates.timelineBug({ bug: bugs[i] });
    }
    element.append(html);

    $(".timeago").timeago();

    // fetch the recent events for each bug asynchronously
    bugs.forEach(function(bug) { bzhome.populateEvents(bug, type) });
  },

  populateEvents : function(bug, type) {
    var id = "#" + type + " .bug-" + bug.id;

    bzhome.user.client.getBug(bug.id, {
      include_fields: 'id,assigned_to,summary,status,resolution,history,'
        + 'comments,last_change_time,creator,creation_time,assigned_to_detail'
    }, function(err, bug) {
      if (err) {
        return console.log(err);
      }

      if (!bzhome.isOpen(bug)) {
        $(id + " .timeline-bug").addClass("closed-bug");
      }

      var events = [],
          history = bug.history;
      /*
       history.reverse(); // newest to oldest
       for (var i = 0; i < history.length; i++) {
       var changeset = history[i];
       events.push({
       time: changeset.change_time,
       changeset: changeset,
       author: changeset.changer
       });
       }
       */

      var comments = bug.comments;
      var assignee_lastUpdateTime;
      comments.reverse(); // newest to oldest
      for (var i = 0; i < comments.length; i++) {
        var comment = comments[i];
        if (!assignee_lastUpdateTime &&
            type == 'assigned' &&
            bug.assigned_to.name == comment.creator.name) {
          //TODO debug
          assignee_lastUpdateTime = comment.creation_time;
          console.log(comment);
        }
        events.push({
          time: comment.creation_time,
          comment: comment,
          author: comment.creator
        });
      }
      events.sort(utils.byTime);
      events.push({
        time: bug.creation_time,
        creator: bug.creator,
        created: true
      });

      var lastDate = new Date(assignee_lastUpdateTime);
      var d = new Date();
      d.setMonth(d.getMonth() - 3);

      if (type == 'assigned') {
        if (lastDate > d) {
          $(id).append("<span class='timeago'" +" title=" + assignee_lastUpdateTime + ">");
          if (!bzhome.isOpen(bug)) {
            bzhome.user.bugclose++;
            //              console.log("closed bug");
            //              console.log(bug.id);
          } else {
            bzhome.user.bugopen++;
          }
          $("#teamtable tr").each(function() {
            if($(this).find("td>input").val() == $("#login-name").val()) {
              console.log("found match start");
              $(this).find(".open").text(bzhome.user.bugopen);
              $(this).find(".close").text(bzhome.user.bugclose);
              //       console.log($(this).find(".open"));
              //       console.log("found match");
            }
          });
        } else {
          $(id).hide();
        }
      }

      console.log(bzhome.user.bugopen + " " + bzhome.user.bugclose);
      var html = bzhome.templates.bugEvents({ bug: bug, events:events });
      $(id).append(html);
      
      $(id + " .event:not(:first-child)").hide();

      // click first event to expand events
      var hidden = true;
      $(id + " .event:first-child").click(function() {
        if (hidden) {
          $(id + " .event").addClass("highlight").show();
          hidden = false;
        }
        else {
          $(id + " .event").removeClass("highlight");
          $(id + " .event:not(:first-child)").hide();
          hidden = true;
        }
      });

      $(".timeago").timeago();
    });
  },

  populateAutocomplete : function() {
    var input = $(".component-search, .new-component");
    bzhome.user.client.getConfiguration({
      flags: 0,
      cached_ok: 1
    }, function(err, config) {
      var components = [];
      for (product in config.product) {
        var comps = config.product[product].component;
        for (component in comps) {
          components.push({
            product: product,
            component: component,
            string: bzhome.componentName({product: product, component: component})
          });
        }
      }
      input.autocomplete({
        list: components,
        minCharacters: 2,
        timeout: 200,
        adjustWidth: 280,
        template: function(item) {
          return "<li value='" + item.string + "'><span class='product'>"
            + item.product + "</span>" + "<span class='component'>"
            + item.component + "</span></li>"
        },
        matcher: function(typed) {
          return typed;
        },
        match: function(item, matcher) {
          var words = matcher.split(/\s+/);
          return _(words).all(function(word) {
            return item.string.toLowerCase().indexOf(word.toLowerCase()) >= 0;
          });
        },
        insertText: function(item) {
          return item.string;
        }
      });
    });
  }
};

