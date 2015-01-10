function cal(year, month) {
  var first = (new Date(year, month))
  , last = new Date(year, month+1, 0)
  , days = [];
  for (var d=1; d<last.getDate()+1; d++) {
    date = new Date(year, month, d);
    days.push({
      date: date,
      agenda: menu[date],
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
previous_selection = {
  "Sat Oct 04 2014 00:00:00 GMT-0400 (EDT)":2,
  "Sat Oct 18 2014 00:00:00 GMT-0400 (EDT)":3,
  "Tue Nov 18 2014 00:00:00 GMT-0500 (EST)":7
};
dates = [];
for (d in menu){
  realdate = new Date(d);
  menu[realdate] = menu[d];
  delete menu[d];
  dates.push(realdate);
}
var min_date = new Date(Math.min.apply(null, dates))
, max_date = new Date(Math.max.apply(null, dates))
, min_month = min_date.getMonth()
, max_month = max_date.getMonth()
, year = min_date.getFullYear()
, cals = []
;
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
  GRADES: ['Ms. Shim', 'Mr. De Ponte', 'Ms. Crocket'],
  orders: [],
  menu:menu,
  cals:cals,
  selection: {},
  submitted:false,
  dateString: function(d) {
    return (new Date(d)).toDateString();
  },
  order_id: order_id,
  get_options: get_options,
  total: function() {
    var t = 0;
    var selection = this.get('selection');
    for(var d in selection) {
      var oid = selection[d];
      if (oid)
        t += parseInt(get_options(d, oid).cost);
    }
    return t;
  },
},
ractive = new Ractive({
  el: 'container',
  template: '#template',
  delimiters: [ '[[', ']]' ],
  magic: true,
  data: data,
});
ractive.observe('previous_order', function(new_value, old, keypath) {
  if (new_value) {
    if (/^\\d/.test(new_value)) {
      ractive.set('grade', new_value.substr(0,1).toUpperCase());
      new_value = new_value.substr(1);
    } else {
      ractive.set('grade', new_value.substr(0,2).toUpperCase());
      new_value = new_value.substr(2);
    }
    if (/^[a-e]/.test(new_value)) {
      ractive.set('klass', new_value.substr(0,1).toUpperCase());
      new_value = new_value.substr(1);
    } else {
      ractive.set('klass', new_value.substr(0,3).toUpperCase());
      new_value = new_value.substr(3);
    }
    if (new_value) {
      ractive.set('student_id', new_value);
      ractive.set('selection', previous_selection);
    }
  }
});
ractive.on({
  add_child: function(){
    data.orders.unshift({});
  },
  submit: function(){
    this.set('submitted', true);
    window.setTimeout(500, function(){
      window.scrollTo(0,0);
    });
  },
  again: function(){
    this.set('submitted', false);
    previous_selection[order_id()] = ractive.get('selection');
    ractive.set('selection', {});
    ractive.set('grade', null);
    ractive.set('klass', null);
    ractive.set('student_id', null);
    ractive.set('previous_order', null);
    window.setTimeout(500, function(){
      window.scrollTo(0,0);
    });
  },
});

