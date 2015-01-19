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
  var month = year + '-' + (m+1);
  cals.push({month:month, cal:cal(year, m)});
}

function order_id(){
  return ractive.get('grade') + ractive.get('klass') + ractive.get('student_id')
}
function get_options(date, option_id) {
  return menu[date].options[option_id];
}

var data = {
  GRADES: ['Ms. Shim', 'Mr. Da Ponte', 'Ms. Crockett'],
  orders: [],
  menu:menu,
  cals:cals,
  active_order_idx:0,
  total: 0,

  dateString: function(d) {
    return (new Date(d)).toDateString().replace(/ \d+$/, '');
  },
  line_total: function (day_idx, option_idx, quantity) {
    var agenda = menu[day_idx];
    var cost = agenda.options[option_idx].cost
    var total = cost * quantity;
    if (agenda.meal_type === 'pizza' && quantity > 0) total++;
    return total;
  },
},

ractive = new Ractive({
  el: 'container',
  template: '#template',
  delimiters: [ '[[', ']]' ],
  magic: true,
  data: data,
  show_cal: function(order_idx){
    $.scrollTo('#order-cal-'+order_idx, 1000);
    listen_to_scrolling = false;
    setTimeout(function(){listen_to_scrolling = true}, 3000);
  },
  add_child: function(){
    ractive.push('orders', {});
    // Somehow ractive set the teach to the first option
    data.orders.slice(-1)[0].teacher=null;
    setTimeout(function(){
      $.scrollTo('.order-calendars:last', 'slow', {offset: {top: -50}});
    }, 100);
  },
  submit: function() {
    var msg = "Once submitted, you cannot change the order. Are you sure you want to go ahead?";
    if (confirm(msg)) {
      $.blockUI(scrn_lock_style);
      $.post('/submit-orders', {
        user_id:data.user_id,
        pin_code: data.pin_code,
        orders: JSON.stringify(data.orders),
      }, function(rslt){
        console.log(rslt);
        data.submitted = true;
        $.unblockUI();
      });

    }
  },
  oncomplete: function(){
    if (location.search == '?demo') {
      data.pin_code = 'demo9';
      ractive.set('orders', [{"child_name":"vince","teacher":"Mr. Da Ponte",}]);
    }
    $.holdReady(false);
  },
});


ractive.observe('pin_code', function(new_value, old, keypath) {
  if (!data.loggedin && data.pin_code.length === 5) {
    $.blockUI(scrn_lock_style);
    // Authenticate against the server
    $.post('/auth', {
      pin_code: data.pin_code,
    }, function(rslt) {
      if ('user_id' in rslt) {
        data.loggedin = true;
        data.user_id = rslt.user_id;
        data.orders = [{}];
        $('#order-summary').affix({offset:{top:180}});
        data.pin_error = false;
      } else {
        data.pin_error = true;
      }
      $.unblockUI();
    });
  }
});


ractive.observe('orders.*.order_per_day.*.*', function(new_value, old, keypath) {
  var total = 0;
  var keypath_parts = keypath.split('.');
  var order_idx = keypath_parts[1];
  var day_idx = keypath_parts[3];
  var option_idx = keypath_parts[4];
  setTimeout(function(){
    var $hot_item = $('#line-item-'+order_idx+'-'+day_idx+'-'+option_idx);
    if ($hot_item.length) {
      $('.order-tables.panel').scrollTo($hot_item, 1000, 'elasout');
      $hot_item.addClass('bg-success');
      setTimeout(function(){
        $hot_item.removeClass('bg-success');
      }, 3000);
    }
  }, 100);
  $.each(data.orders, function(order_idx, order) {
    if (order.order_per_day) {
      $.each(order.order_per_day, function(day_idx, quantities) {
        $.each(quantities, function(option_idx, quantity) {
          total += data.line_total(day_idx, option_idx, quantity);
        });
      })
    }
  });
  data.total = total;
});


/* Jquery section
 */

$(function(){
  function adjust_screen(){
    $('#order-summary .panel').css('max-height', document.documentElement.clientHeight - $('#order-summary .btn-toolbar').height()*2);
  }
  adjust_screen();
  $(window).scroll(function(evt){
    var $body = $('body');
    var ratio = $body.scrollTop() * 1.0 / $body.height();

    $('.order-calendars').each(function(idx){
      var top = this.getBoundingClientRect().top;
      var bottom = this.getBoundingClientRect().bottom;
      var mid_height = $(window).height() / 2;
      if (data.active_order_idx !== idx && top < mid_height && bottom > mid_height) {
        data.active_order_idx = idx;
        if (!listen_to_scrolling) return;
        var $order = $('#order-' + idx);
        var $order_panel = $('#order-summary .panel');
        var top = $order.position.top;
        if (top < 0 || top > $order_panel.height() - 30);
          $order_panel.scrollTo($order, 1000);
        return;
      }
    });
  }).resize(function(evt){
    adjust_screen();
  });
});
