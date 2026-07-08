import numpy as np

def calculate_angle(a, b, c):
    a = np.array(a); b = np.array(b); c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0: angle = 360 - angle
    return angle

# Let's say we have an angle that is physically 45 degrees
# In 1080x1920 video (portrait)
# x is normalized by 1080, y is normalized by 1920
# physical dx = 100, dy = 100 -> angle = 45 deg
# normalized dx = 100 / 1080 = 0.0925
# normalized dy = 100 / 1920 = 0.0520

a = [0, 0]
b = [0.0925, 0.0520]
c = [0.0925, 0] # horizontal line
print("Distorted angle:", calculate_angle(a, b, c))

# Un-distorted
a_fixed = [a[0]*1080, a[1]*1920]
b_fixed = [b[0]*1080, b[1]*1920]
c_fixed = [c[0]*1080, c[1]*1920]
print("Fixed angle:", calculate_angle(a_fixed, b_fixed, c_fixed))
