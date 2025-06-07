from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

ghost_state = {
    "position": [5, 5], 
    "health": 100,      
    "max_x": 9,
    "max_y": 9,
    "min_x": 0,
    "min_y": 0
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/move_ghost', methods=['POST'])
def move_ghost():
    data = request.get_json()
    direction = data.get('direction')

    x, y = ghost_state["position"]

    if direction == 'left' and x > ghost_state["min_x"]:
        x -= 1
    elif direction == 'right' and x < ghost_state["max_x"]:
        x += 1
    elif direction == 'up' and y > ghost_state["min_y"]:
        y -= 1
    elif direction == 'down' and y < ghost_state["max_y"]:
        y += 1
    else:
        return jsonify({"message": "Can't move outside the boundaries."})

    ghost_state["position"] = [x, y]
    return jsonify({
        "position": ghost_state["position"],
        "health": ghost_state["health"]
    })

@app.route('/damage_ghost', methods=['POST'])
def damage_ghost():
    data = request.get_json()
    damage = data.get('damage', 0)

    ghost_state["health"] -= damage
    if ghost_state["health"] < 0:
        ghost_state["health"] = 0

    alive = ghost_state["health"] > 0

    return jsonify({
        "health": ghost_state["health"],
        "alive": alive
    })

if __name__ == '__main__':
    app.run(debug=True)