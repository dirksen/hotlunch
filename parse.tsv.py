import sys, json

menu = []
for i, ln in enumerate(sys.stdin):
    if i > 1:
        cells = ln.split('\t')
        date, meal_type, desc, option, price, cost = cells[:6]
        def parse(money):
            money = money.strip()
            return money[1:] if money.startswith('$') else money
        price = parse(price)
        cost = parse(cost)
        if date:
            xdate = date
            menu.append(dict(date=date, meal_type=meal_type.replace(' DAY', ''), options=[dict(option=option, price=price, cost=cost)]))
        else:
            menu[-1]['options'].append(dict(id=i, option=option, price=price, cost=cost))
    else:
        # skip header
        pass
print 'menu = ', json.dumps(menu, indent=2)
