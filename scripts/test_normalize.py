import numpy as np

def calculate_angle(a, b, c):
    a = np.array(a); b = np.array(b); c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0: angle = 360 - angle
    return angle

landmarks = np.random.rand(33, 2)
# shoulder
left_shoulder = landmarks[11]
right_shoulder = landmarks[12]
shoulder_width = np.linalg.norm(left_shoulder - right_shoulder) + 1e-6

left_hip = landmarks[23]
right_hip = landmarks[24]
hip_center = (left_hip + right_hip) / 2

norm_landmarks = (landmarks - hip_center) / shoulder_width

a1 = calculate_angle(landmarks[11], landmarks[13], landmarks[15])
a2 = calculate_angle(norm_landmarks[11], norm_landmarks[13], norm_landmarks[15])
print("Original:", a1, "Normalized:", a2, "Diff:", abs(a1-a2))
