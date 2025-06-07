class Ghost:
    def __init__(self, x, y, health=100):
        self.x = x
        self.y = y
        self.health = health  # صحة الشبح تبدأ بـ 100 مثلاً

    def move(self, direction):
        if direction == "left":
            self.x -= 1
        elif direction == "right":
            self.x += 1
        elif direction == "up":
            self.y -= 1
        elif direction == "down":
            self.y += 1

    def get_position(self):
        return self.x, self.y

    def take_damage(self, amount):
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):
        return self.health > 0

    def heal(self, amount):
        self.health += amount
        if self.health > 100:  # أقصى صحة 100
            self.health = 100
