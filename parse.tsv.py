import sys, json

menu = []
for i, ln in enumerate(sys.stdin):
    if i > 1:
        cells = ln.split('\t')
        date, meal_type, desc, option, price = cells
        price = price.strip()
        price = price[1:] if price.startswith('$') else price
        if date:
            xdate = date
            menu.append(dict(date=date, meal_type=meal_type.replace(' DAY', ''), options=[dict(option=option, price=price)]))
        else:
            menu[-1]['options'].append(dict(id=i, option=option, price=price))
print 'var menu = ', json.dumps(menu, indent=2)
