$.holdReady(true);

var cals = []
, submitted = false
, listen_to_scrolling = true
, dates = []
, agendas = {}
, user_id = null
, scrn_lock_style = { css: {
  border: 'none',
  padding: '15px',
  backgroundColor: '#000',
  '-webkit-border-radius': '10px',
  '-moz-border-radius': '10px',
  opacity: .5,
  color: '#fff'
} }
;

$.each(menu, function(idx){
  realdate = new Date(this.date);
  this.idx = idx;
  agendas[realdate] = this;
  dates.push(realdate);
});

var min_date = new Date(Math.min.apply(null, dates))
, max_date = new Date(Math.max.apply(null, dates))
, min_month = min_date.getMonth()
, max_month = max_date.getMonth()
, year = min_date.getFullYear()

function cal(year, month) {
  var first = (new Date(year, month))
  , last = new Date(year, month+1, 0)
  , days = [];
  for (var d=1; d<last.getDate()+1; d++) {
    date = new Date(year, month, d);
    days.push({
      date: date,
      agenda: agendas[date],
      daynum: d,
    });
  }
  for (var d=0; d<first.getDay(); d++) {
    days.splice(0, 0, '');
  }
  for (var d=last.getDay()+1; d<7; d++) {
    days.push('');
  }
  var cal = [];
  for (var d=0; d<days.length; d+=7) {
    cal.push(days.slice(d, d+7));
  }
  return cal;
}

for (var m = min_month; m <= max_month; m ++) {
  var month = moment([year, m]).format('MMM, YYYY');
  cals.push({month:month, cal:cal(year, m)});
}

function order_id(){
  return ractive.get('grade') + ractive.get('klass') + ractive.get('student_id')
}
function get_options(date, option_id) {
  return menu[date].options[option_id];
}

if (typeof CLASSES === 'undefined')
  CLASSES = ['Ms. Lee', 'Mr. Wellinton'];

var data = {
  CLASSES: CLASSES,
  orders: [],
	review_mode: false,
  menu:menu,
  cals:cals,
  active_order_idx:0,
  totals: [],

	name_valid: function(name) {
		// a name is valid if it has alphabets, and at least one space
		return /[a-z]+ +[a-z]+/i.test(name);
	},
  dateString: function(d) {
    return moment(d).format('MMM Do');
  },
},

ractive = new Ractive({
  el: 'container',
  template: '#template',
  delimiters: [ '[[', ']]' ],
  data: data,
  show_cal: function(order_idx){
    $.scrollTo('#order-cal-'+order_idx, 1000);
    listen_to_scrolling = false;
    setTimeout(function(){listen_to_scrolling = true}, 3000);
  },
  add_child: function(){
    // We're gonna add a new order, as array is 0-based, the active_order_idx will be the same as the current length
    ractive.set('active_order_idx', ractive.get('orders.length'));
    ractive.push('orders', {child_name:null, teacher:null});
  },
	del_order: function(){
		var msg = "Are you sure you want to delete this order(just this one)?";
		if (confirm(msg)) {
			ractive.splice('orders', ractive.get('active_order_idx'), 1);
		}
	},
  hilite_cal: function(day_idx){
    var $day_cell = $('#day-' + day_idx)
    $day_cell.addClass('bg-info');
    $.debounce(450, function(){
      var top = $day_cell.position().top;
      if (top< 90) {
        $('#calendar').scrollTo($day_cell, 1000, {over:-10});
      } else if (top > $('#calendar').height()) {
        $('#calendar').scrollTo($day_cell, 1000, {over:10});
      }
    })();
  },
  lolite_cal: function(day_idx){
    $('#day-' + day_idx).removeClass('bg-info');
  },
  submit: function() {
    var msg = "Once submitted, you cannot change the order. Are you sure you want to go ahead?";
    if (confirm(msg)) {
      $.blockUI(scrn_lock_style);
      $.post('/submit-orders', {
        user_id:ractive.get('user_id'),
        pin_code: ractive.get('pin_code'),
        orders: JSON.stringify(ractive.get('orders')),
        total: ractive.get('orders.grand_total'),
      }, function(rslt){
        ractive.set('submitted', true);
        $.unblockUI();
      });

    }
  },
  oncomplete: function(){
    if (location.search) {
      ractive.set('pin_code', location.search.substr(1,99));
			if (ractive.get('pin_code') === 'demo9') {
				setTimeout(function(){
					ractive.set('orders', [{"child_name":"Catlen Cooey","teacher":CLASSES[0],}]);
				}, 1000);
			}
    }
    $.holdReady(false);
  },
});


ractive.observe('pin_code', function(new_value, old_value, keypath) {
  if (!ractive.get('loggedin') && ractive.get('pin_code.length') === 5) {
    $.blockUI(scrn_lock_style);
    // Authenticate against the server
    $.post('/auth', {
      pin_code: ractive.get('pin_code'),
    }, function(rslt) {
      if ('user_id' in rslt) {
        ractive.set('loggedin', true);
        ractive.set('user_id', rslt.user_id)
        ractive.set('orders', [{}])
        ractive.set('pin_error', false)
        // Force the screen to layout the calendar
        setTimeout(function() {
          $(window).resize();
        }, 100);
      } else if ('orders' in rslt) {
				ractive.set('review_mode', true)
				ractive.set('loggedin', true)
				ractive.set('orders', rslt.orders);
      } else {
        ractive.set('pin_error', true)
      }
      $.unblockUI();
    });
  }
});

ractive.observe('orders.*.child_name orders.*.teacher', function(new_value, old_value, keypath) {
	if (ractive.get('review_mode')) return false;

  // count how many orders having blank child_name or teacher
	var name_valid = ractive.get('name_valid')
  var rslt = $.grep(ractive.get('orders'), function(e){return !name_valid(e.child_name) || !e.teacher});
  ractive.set('can_submit', (rslt.length === 0));
});

ractive.observe('orders.*.by_days.*.*', function(new_value, old_value, keypath) {
  var keypath_parts = keypath.split('.');
  var order_idx = keypath_parts[1];
  var day_idx = keypath_parts[3];
  var daily_menu = menu[day_idx];

  var daily_total = 0;
  $.each(ractive.get('orders')[order_idx].by_days[day_idx], function(option_idx, quantity) {
    if (quantity > 0) {
      daily_total += quantity * daily_menu.options[option_idx].cost;
      // For pizza, the 1st slice is $3, $2 for additional slices
      if (daily_menu.meal_type.toUpperCase() === 'PIZZA') daily_total++;
    }
  });
  if (!ractive.get('totals')) ractive.set('totals', [])
  if (!ractive.get('totals')[order_idx]) ractive.set('totals[order_idx]', [])
  ractive.set('totals[' + order_idx + '][' + day_idx + ']', daily_total);

  var grand_total = 0;
  $.each(ractive.get('totals'), function(_, totals_per_order){
    var sub_total = 0;
    $.each(totals_per_order||[], function(_, daily_total){
      sub_total += (daily_total || 0);
    });
    grand_total += sub_total;
  });
  ractive.set('orders.grand_total', grand_total);
});


/* Jquery section
 */

$(function(){
  $(window).resize(function(evt){
    var $main_content = $('#order-taking-form');
    var $order_forms = $('#order-forms');
    $('#calendar').css({
      width: $main_content.width()/2-50,
      left: $order_forms.position().left + $order_forms.width() + 50,
    });
  });
  //$('#calendar').affix({offset:{top:180}});
});
