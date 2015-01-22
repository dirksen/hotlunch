import sys, json

menu = []
for i, ln in enumerate(sys.stdin):
    if i > 1:
        cells = ln.split('\t')
        date, meal_type, desc, option, cost = cells
        cost = cost.strip()
        cost = cost[1:] if cost.startswith('$') else cost
        if date:
            xdate = date
            menu.append(dict(date=date, meal_type=meal_type.replace(' DAY', ''), options=[dict(option=option, cost=cost)]))
        else:
            menu[-1]['options'].append(dict(id=i, option=option, cost=cost))
print 'var menu = ', json.dumps(menu, indent=2)
