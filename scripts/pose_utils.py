import numpy as np

def calculate_angle(a,b,c):
    a = np.array(a) # First
    b = np.array(b) # Mid
    c = np.array(c) # End

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)

    if angle > 180.0:
        angle = 360-angle

    return angle

def calculate_slope(point1, point2):
    """Calculates the angle of a line relative to the horizontal axis."""
    # Returns absolute angle from horizontal
    slope = np.degrees(np.arctan2(point2[1] - point1[1], point2[0] - point1[0]))
    return abs(slope)

def classify_warrior2_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder, left_wrist, right_shoulder, right_wrist):
    """Classifies Warrior 2 pose with Refined Logic (Slope Check)."""
    
    # 1. Elbows Straight
    arms_straight_joint = (left_arm_angle > 150 and right_arm_angle > 150)

    # 2. Arms Parallel to Floor (Slope Check)
    # Ideally should be roughly 0 degrees or 180 degrees depending on direction
    # We allow a +/- 20 degree deviation from horizontal
    l_slope = calculate_slope(left_shoulder, left_wrist)
    r_slope = calculate_slope(right_shoulder, right_wrist)

    arms_horizontal = (l_slope < 20 or abs(l_slope - 180) < 20) and \
                      (r_slope < 20 or abs(r_slope - 180) < 20)

    # 3. Legs Logic (One bent ~90, one straight)
    warrior_2_left_bent = (left_leg_angle > 80 and left_leg_angle < 110 and
                           right_leg_angle > 160)

    warrior_2_right_bent = (right_leg_angle > 80 and right_leg_angle < 110 and
                            left_leg_angle > 160)

    if arms_straight_joint and arms_horizontal and (warrior_2_left_bent or warrior_2_right_bent):
        return True
    return False

def classify_warrior1_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Warrior 1 pose."""
    # Arms are straight and raised.
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    arms_up = left_shoulder_angle > 140 and right_shoulder_angle > 140

    # One leg bent, one leg straight
    warrior_1_left_bent = (arms_straight and arms_up and
                           left_leg_angle > 80 and left_leg_angle < 120 and
                           right_leg_angle > 160)

    warrior_1_right_bent = (arms_straight and arms_up and
                            right_leg_angle > 80 and right_leg_angle < 120 and
                            left_leg_angle > 160)

    if warrior_1_left_bent or warrior_1_right_bent:
        return True
    return False


def classify_tree_pose_refined(left_leg_angle, right_leg_angle, left_ankle, right_ankle, left_knee, right_knee):
    """Classifies Tree pose (Vrksasana) with Refined Logic (Ankle Placement)."""
    
    # Check 1: General Leg Shapes
    left_standing = (left_leg_angle > 165 and right_leg_angle < 110)
    right_standing = (right_leg_angle > 165 and left_leg_angle < 110)

    is_tree_pose = False

    # Check 2: Foot Placement (Ankle close to Knee)
    # Note: normalized coordinates (0.0 to 1.0)
    # Threshold: 0.15 is roughly 15% of screen width tolerance
    
    if left_standing:
        # Check if right ankle is close to left knee (in X-axis)
        horizontal_dist = abs(right_ankle[0] - left_knee[0])
        # Check if right ankle is vertically higher than the left ankle (y is inverted, smaller is higher)
        vertical_check = right_ankle[1] < left_ankle[1] 
        
        if horizontal_dist < 0.15 and vertical_check:
            is_tree_pose = True

    elif right_standing:
        horizontal_dist = abs(left_ankle[0] - right_knee[0])
        vertical_check = left_ankle[1] < right_ankle[1]
        
        if horizontal_dist < 0.15 and vertical_check:
            is_tree_pose = True

    return is_tree_pose

def classify_triangle_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Triangle pose (Trikonasana)."""
    # Legs should be straight
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    # Arms should be straight
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    
    # Arms raised (approx 90 degrees relative to body, or effectively out)
    # Using shoulder angle (hip-shoulder-wrist)
    arms_out = left_shoulder_angle > 60 and right_shoulder_angle > 60
    
    # Torso bent to one side. 
    # Normal standing is ~180. Triangle involves bending at hip.
    # We check if one side angle is significantly less than 165 indicating a bend.
    torso_bent = left_body_angle < 165 or right_body_angle < 165

    if legs_straight and arms_straight and arms_out and torso_bent:
        return True
    return False

def classify_mountain_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Mountain pose (Tadasana)."""
    # Legs straight
    legs_straight = left_leg_angle > 170 and right_leg_angle > 170
    
    # Arms straight
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160
    
    # Arms down at sides (angle between hip-shoulder-wrist should be small)
    arms_down = left_shoulder_angle < 30 and right_shoulder_angle < 30

    if legs_straight and arms_straight and arms_down:
        return True
    return False

def classify_plank_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle):
    """Classifies Plank pose (Phalakasana) with Refined Logic (Straight Line Check)."""
    
    # 1. Arms must be straight (supporting weight)
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160

    # 2. Body must be straight (Shoulder-Hip-Knee angle should be ~180)
    # A sagging hip might result in < 160. A piqued hip (downward dog) might be < 140.
    body_straight = left_body_angle > 165 and right_body_angle > 165
    
    # 3. Legs Straight (Hip-Knee-Ankle)
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    if arms_straight and body_straight and legs_straight:
        return True
    return False

def classify_warrior2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle):
    """Classifies Warrior 2 pose."""
    warrior_2_left_bent = (left_arm_angle > 160 and left_arm_angle < 200 and
                         right_arm_angle > 160 and right_arm_angle < 200 and
                         left_leg_angle > 80 and left_leg_angle < 110 and
                         right_leg_angle > 160 and right_leg_angle < 200)

    warrior_2_right_bent = (left_arm_angle > 160 and left_arm_angle < 200 and
                          right_arm_angle > 160 and right_arm_angle < 200 and
                          right_leg_angle > 80 and right_leg_angle < 110 and
                          left_leg_angle > 160 and left_leg_angle < 200)

    if warrior_2_left_bent or warrior_2_right_bent:
        return True
    return False

def classify_warrior1(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Warrior 1 pose."""
    # Arms are straight and raised.
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    arms_up = left_shoulder_angle > 140 and right_shoulder_angle > 140

    # One leg bent, one leg straight
    warrior_1_left_bent = (arms_straight and arms_up and
                           left_leg_angle > 80 and left_leg_angle < 120 and
                           right_leg_angle > 160)

    warrior_1_right_bent = (arms_straight and arms_up and
                            right_leg_angle > 80 and right_leg_angle < 120 and
                            left_leg_angle > 160)

    if warrior_1_left_bent or warrior_1_right_bent:
        return True
    return False


def classify_tree_pose(left_leg_angle, right_leg_angle, left_ankle, right_ankle, left_knee, right_knee):
    """Classifies Tree pose (Vrksasana)."""
    # Left leg is standing leg
    tree_pose_left_standing = (left_leg_angle > 160 and left_leg_angle < 200 and
                               right_leg_angle < 100 and
                               right_ankle[1] < left_knee[1])

    # Right leg is standing leg
    tree_pose_right_standing = (right_leg_angle > 160 and right_leg_angle < 200 and
                                left_leg_angle < 100 and
                                left_ankle[1] < right_knee[1])

    if tree_pose_left_standing or tree_pose_right_standing:
        return True
    return False

def classify_triangle_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Triangle pose (Trikonasana)."""
    # Legs should be straight
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    # Arms should be straight
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    
    # Arms raised (approx 90 degrees relative to body, or effectively out)
    # Using shoulder angle (hip-shoulder-wrist)
    arms_out = left_shoulder_angle > 60 and right_shoulder_angle > 60
    
    # Torso bent to one side. 
    # Normal standing is ~180. Triangle involves bending at hip.
    # We check if one side angle is significantly less than 165 indicating a bend.
    torso_bent = left_body_angle < 165 or right_body_angle < 165

    if legs_straight and arms_straight and arms_out and torso_bent:
        return True
    return False

def classify_mountain_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Mountain pose (Tadasana)."""
    # Legs straight
    legs_straight = left_leg_angle > 170 and right_leg_angle > 170
    
    # Arms straight
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160
    
    # Arms down at sides (angle between hip-shoulder-wrist should be small)
    arms_down = left_shoulder_angle < 30 and right_shoulder_angle < 30

    if legs_straight and arms_straight and arms_down:
        return True
    return False

def classify_plank_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, shoulder_l, ankle_l, shoulder_r, ankle_r):
    """Classifies Plank pose (Phalakasana)."""
    # Legs straight
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    # Arms straight involved in support
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160
    
    # Body roughly horizontal? 
    # Check if vertical distance between shoulder and ankle is small relative to horizontal
    # This assumes side view.
    # If front view, this logic might fail, but plank is usually side view.
    
    horizontal_l = abs(shoulder_l[1] - ankle_l[1]) < abs(shoulder_l[0] - ankle_l[0])
    horizontal_r = abs(shoulder_r[1] - ankle_r[1]) < abs(shoulder_r[0] - ankle_r[0])
    
    if legs_straight and arms_straight and (horizontal_l or horizontal_r):
        return True
    return False


# ============================================================================
# V2 METHODS - Improved accuracy and stability with confidence scoring
# ============================================================================


def classify_warrior1_v2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, 
                          left_shoulder_angle, right_shoulder_angle, left_hip=None, right_hip=None,
                          left_shoulder=None, right_shoulder=None):
    """
    Classifies Warrior 1 pose (Virabhadrasana I) with improved accuracy.
    
    Key features:
    - Arms straight and raised overhead
    - One leg bent at ~90 degrees (front knee)
    - Back leg straight
    - Hips squared forward (if landmarks available)
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # 1. Arms straight (elbow angle > 150)
    left_arm_score = _score_angle_in_range(left_arm_angle, 150, 180, buffer=20)
    right_arm_score = _score_angle_in_range(right_arm_angle, 150, 180, buffer=20)
    arms_straight_score = (left_arm_score + right_arm_score) / 2
    scores.append(arms_straight_score * 1.0)  # Weight: 1.0
    
    # 2. Arms raised overhead (shoulder angle > 140)
    left_shoulder_score = _score_angle_in_range(left_shoulder_angle, 140, 180, buffer=25)
    right_shoulder_score = _score_angle_in_range(right_shoulder_angle, 140, 180, buffer=25)
    arms_up_score = (left_shoulder_score + right_shoulder_score) / 2
    scores.append(arms_up_score * 1.5)  # Weight: 1.5 (important feature)
    
    # 3. One leg bent (80-120), one leg straight (>155)
    # Check both configurations
    left_bent_score = _score_angle_in_range(left_leg_angle, 80, 120, buffer=15)
    right_straight_score = _score_angle_in_range(right_leg_angle, 155, 180, buffer=15)
    config1 = (left_bent_score + right_straight_score) / 2
    
    right_bent_score = _score_angle_in_range(right_leg_angle, 80, 120, buffer=15)
    left_straight_score = _score_angle_in_range(left_leg_angle, 155, 180, buffer=15)
    config2 = (right_bent_score + left_straight_score) / 2
    
    leg_score = max(config1, config2)
    scores.append(leg_score * 2.0)  # Weight: 2.0 (most important)
    
    # 4. Optional: Hip alignment check
    if left_hip is not None and right_hip is not None:
        hip_diff = abs(left_hip[1] - right_hip[1])  # Vertical difference
        hip_alignment_score = 1.0 if hip_diff < 0.05 else max(0, 1.0 - hip_diff * 5)
        scores.append(hip_alignment_score * 0.5)  # Weight: 0.5
    
    # Calculate weighted average
    total_weight = 1.0 + 1.5 + 2.0 + (0.5 if left_hip is not None else 0)
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.65
    return (is_pose, round(confidence, 3))


def classify_warrior2_v2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle,
                          left_shoulder, left_wrist, right_shoulder, right_wrist,
                          left_hip=None, right_hip=None):
    """
    Classifies Warrior 2 pose (Virabhadrasana II) with improved accuracy.
    
    Key features:
    - Arms extended horizontally (parallel to ground)
    - One leg bent at ~90 degrees
    - Other leg straight
    - Shoulders over hips (side-facing stance)
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # 1. Arms straight (elbow angle > 150)
    left_arm_score = _score_angle_in_range(left_arm_angle, 150, 180, buffer=20)
    right_arm_score = _score_angle_in_range(right_arm_angle, 150, 180, buffer=20)
    arms_straight_score = (left_arm_score + right_arm_score) / 2
    scores.append(arms_straight_score * 1.0)
    
    # 2. Arms horizontal (slope check - should be close to 0 or 180 degrees)
    l_slope = calculate_slope(left_shoulder, left_wrist)
    r_slope = calculate_slope(right_shoulder, right_wrist)
    
    # Slope should be < 25 degrees from horizontal
    left_horizontal = 1.0 if l_slope < 15 else max(0, 1.0 - (l_slope - 15) / 25)
    right_horizontal = 1.0 if r_slope < 15 else max(0, 1.0 - (r_slope - 15) / 25)
    # Also check if close to 180 (other direction)
    left_horizontal = max(left_horizontal, 1.0 if abs(l_slope - 180) < 15 else max(0, 1.0 - (abs(l_slope - 180) - 15) / 25))
    right_horizontal = max(right_horizontal, 1.0 if abs(r_slope - 180) < 15 else max(0, 1.0 - (abs(r_slope - 180) - 15) / 25))
    
    horizontal_score = (left_horizontal + right_horizontal) / 2
    
    # HARD REQUIREMENT: Arms must be reasonably horizontal for Warrior 2
    # This distinguishes W2 (horizontal arms) from W1 (overhead arms)
    if horizontal_score < 0.4:
        return (False, 0.0)
    
    scores.append(horizontal_score * 2.0)  # Weight: 2.0 (key distinguishing feature)
    
    # 3. One leg bent, one leg straight
    left_bent_score = _score_angle_in_range(left_leg_angle, 75, 115, buffer=15)
    right_straight_score = _score_angle_in_range(right_leg_angle, 155, 180, buffer=15)
    config1 = (left_bent_score + right_straight_score) / 2
    
    right_bent_score = _score_angle_in_range(right_leg_angle, 75, 115, buffer=15)
    left_straight_score = _score_angle_in_range(left_leg_angle, 155, 180, buffer=15)
    config2 = (right_bent_score + left_straight_score) / 2
    
    leg_score = max(config1, config2)
    scores.append(leg_score * 2.0)  # Weight: 2.0
    
    total_weight = 1.0 + 2.0 + 2.0  # arms_straight + horizontal + legs
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.65
    return (is_pose, round(confidence, 3))


def classify_mountain_v2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle,
                          left_shoulder_angle, right_shoulder_angle,
                          left_shoulder=None, right_shoulder=None, left_hip=None, right_hip=None):
    """
    Classifies Mountain pose (Tadasana) with improved accuracy.
    
    Key features:
    - Standing tall with straight posture
    - Legs straight and together
    - Arms straight at sides
    - Shoulders aligned over hips
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # 1. Legs very straight (> 168)
    left_leg_score = _score_angle_in_range(left_leg_angle, 168, 180, buffer=12)
    right_leg_score = _score_angle_in_range(right_leg_angle, 168, 180, buffer=12)
    legs_score = (left_leg_score + right_leg_score) / 2
    scores.append(legs_score * 2.0)  # Weight: 2.0
    
    # 2. Arms straight
    left_arm_score = _score_angle_in_range(left_arm_angle, 160, 180, buffer=15)
    right_arm_score = _score_angle_in_range(right_arm_angle, 160, 180, buffer=15)
    arms_straight_score = (left_arm_score + right_arm_score) / 2
    scores.append(arms_straight_score * 1.0)
    
    # 3. Arms down at sides (shoulder angle < 35)
    left_down_score = _score_angle_in_range(left_shoulder_angle, 0, 35, buffer=15)
    right_down_score = _score_angle_in_range(right_shoulder_angle, 0, 35, buffer=15)
    arms_down_score = (left_down_score + right_down_score) / 2
    scores.append(arms_down_score * 1.5)  # Weight: 1.5
    
    # 4. Symmetry check (shoulders and hips level)
    symmetry_score = 1.0
    if left_shoulder is not None and right_shoulder is not None:
        shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
        symmetry_score = 1.0 if shoulder_diff < 0.03 else max(0, 1.0 - shoulder_diff * 10)
    if left_hip is not None and right_hip is not None:
        hip_diff = abs(left_hip[1] - right_hip[1])
        hip_symmetry = 1.0 if hip_diff < 0.03 else max(0, 1.0 - hip_diff * 10)
        symmetry_score = (symmetry_score + hip_symmetry) / 2
    scores.append(symmetry_score * 0.5)
    
    total_weight = 2.0 + 1.0 + 1.5 + 0.5
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.70
    return (is_pose, round(confidence, 3))


def classify_plank_v2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle,
                       left_body_angle, right_body_angle,
                       shoulder_l=None, hip_l=None, ankle_l=None,
                       shoulder_r=None, hip_r=None, ankle_r=None):
    """
    Classifies Plank pose (Phalakasana) with improved accuracy.
    
    Key features:
    - Arms straight (supporting body)
    - Body in straight line from head to heels
    - Legs straight
    - Core engaged (no sagging or piking)
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # 1. Arms straight (> 160)
    left_arm_score = _score_angle_in_range(left_arm_angle, 160, 180, buffer=15)
    right_arm_score = _score_angle_in_range(right_arm_angle, 160, 180, buffer=15)
    arms_score = (left_arm_score + right_arm_score) / 2
    scores.append(arms_score * 1.5)
    
    # 2. Body straight (shoulder-hip-knee angle > 165)
    left_body_score = _score_angle_in_range(left_body_angle, 165, 180, buffer=15)
    right_body_score = _score_angle_in_range(right_body_angle, 165, 180, buffer=15)
    body_score = (left_body_score + right_body_score) / 2
    scores.append(body_score * 2.0)  # Weight: 2.0 (key feature)
    
    # 3. Legs straight (> 160)
    left_leg_score = _score_angle_in_range(left_leg_angle, 160, 180, buffer=15)
    right_leg_score = _score_angle_in_range(right_leg_angle, 160, 180, buffer=15)
    legs_score = (left_leg_score + right_leg_score) / 2
    scores.append(legs_score * 1.5)
    
    # 4. Horizontal alignment check (body roughly parallel to ground)
    horizontal_score = 1.0
    if shoulder_l is not None and ankle_l is not None:
        # Body should be more horizontal than vertical
        vert_dist = abs(shoulder_l[1] - ankle_l[1])
        horiz_dist = abs(shoulder_l[0] - ankle_l[0])
        if horiz_dist > 0:
            ratio = vert_dist / horiz_dist
            horizontal_score = 1.0 if ratio < 0.5 else max(0, 1.0 - (ratio - 0.5))
    scores.append(horizontal_score * 1.0)
    
    total_weight = 1.5 + 2.0 + 1.5 + 1.0
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.65
    return (is_pose, round(confidence, 3))

def classify_tree_v2(left_leg_angle, right_leg_angle, 
                      left_ankle, right_ankle, left_knee, right_knee,
                      left_hip=None, right_hip=None,
                      left_shoulder_angle=None, right_shoulder_angle=None):
    """
    Classifies Tree pose (Vrksasana) with improved accuracy.
    
    Key features:
    - One leg straight (standing leg)
    - Other leg bent with foot placed on inner thigh/calf
    - Arms can be overhead, at heart center, or at sides
    - Balance and alignment
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # Determine which leg is standing
    left_standing = left_leg_angle > 160
    right_standing = right_leg_angle > 160
    
    if not left_standing and not right_standing:
        return (False, 0.0)
    
    if left_standing and right_standing:
        # Both legs straight - not tree pose
        return (False, 0.0)
    
    if left_standing:
        # Left leg standing, right leg bent
        standing_score = _score_angle_in_range(left_leg_angle, 165, 180, buffer=10)
        bent_score = _score_angle_in_range(right_leg_angle, 30, 110, buffer=20)
        
        # Foot placement check (right ankle should be near left leg)
        horizontal_dist = abs(right_ankle[0] - left_knee[0])
        foot_placement = 1.0 if horizontal_dist < 0.12 else max(0, 1.0 - (horizontal_dist - 0.12) / 0.15)
        
        # Bent knee should be pointing outward (hip external rotation)
        # Check if right knee is horizontally away from left knee
        knee_outward = abs(right_knee[0] - left_knee[0]) > 0.08
        rotation_score = 1.0 if knee_outward else 0.5
        
    else:
        # Right leg standing, left leg bent
        standing_score = _score_angle_in_range(right_leg_angle, 165, 180, buffer=10)
        bent_score = _score_angle_in_range(left_leg_angle, 30, 110, buffer=20)
        
        horizontal_dist = abs(left_ankle[0] - right_knee[0])
        foot_placement = 1.0 if horizontal_dist < 0.12 else max(0, 1.0 - (horizontal_dist - 0.12) / 0.15)
        
        knee_outward = abs(left_knee[0] - right_knee[0]) > 0.08
        rotation_score = 1.0 if knee_outward else 0.5
    
    scores.append(standing_score * 2.0)  # Weight: 2.0
    scores.append(bent_score * 1.5)  # Weight: 1.5
    scores.append(foot_placement * 1.5)  # Weight: 1.5
    scores.append(rotation_score * 0.5)  # Weight: 0.5
    
    total_weight = 2.0 + 1.5 + 1.5 + 0.5
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.60
    return (is_pose, round(confidence, 3))


def classify_triangle_v2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle,
                          left_body_angle, right_body_angle, 
                          left_shoulder_angle, right_shoulder_angle,
                          left_wrist=None, right_wrist=None, left_ankle=None, right_ankle=None):
    """
    Classifies Triangle pose (Trikonasana) with improved accuracy.
    
    Key features:
    - Legs straight and wide apart
    - Torso bent laterally (to one side)
    - Arms extended in opposite directions (one up, one down)
    - Arms form a vertical line when in full pose
    
    Returns: (is_pose: bool, confidence: float)
    """
    scores = []
    
    # 1. Legs straight (> 160)
    left_leg_score = _score_angle_in_range(left_leg_angle, 158, 180, buffer=15)
    right_leg_score = _score_angle_in_range(right_leg_angle, 158, 180, buffer=15)
    legs_score = (left_leg_score + right_leg_score) / 2
    scores.append(legs_score * 1.5)
    
    # 2. Arms straight (> 150)
    left_arm_score = _score_angle_in_range(left_arm_angle, 150, 180, buffer=20)
    right_arm_score = _score_angle_in_range(right_arm_angle, 150, 180, buffer=20)
    arms_score = (left_arm_score + right_arm_score) / 2
    scores.append(arms_score * 1.0)
    
    # 3. Arms extended outward (shoulder angle > 55)
    left_out_score = _score_angle_in_range(left_shoulder_angle, 55, 180, buffer=20)
    right_out_score = _score_angle_in_range(right_shoulder_angle, 55, 180, buffer=20)
    arms_out_score = (left_out_score + right_out_score) / 2
    scores.append(arms_out_score * 1.0)
    
    # 4. Torso bent to one side (one body angle significantly less than 180)
    # In triangle, you bend to one side, so one angle decreases
    left_bent = left_body_angle < 155
    right_bent = right_body_angle < 155
    
    if left_bent:
        bend_score = _score_angle_in_range(left_body_angle, 90, 155, buffer=20)
    elif right_bent:
        bend_score = _score_angle_in_range(right_body_angle, 90, 155, buffer=20)
    else:
        bend_score = 0.0
    scores.append(bend_score * 2.0)  # Weight: 2.0 (key feature)
    
    # 5. Optional: Check if one arm is reaching down (toward ankle)
    reach_score = 0.5  # Default partial score
    if left_wrist is not None and right_wrist is not None:
        if left_ankle is not None and right_ankle is not None:
            # Check if one wrist is close to an ankle
            left_to_left = np.sqrt((left_wrist[0] - left_ankle[0])**2 + (left_wrist[1] - left_ankle[1])**2)
            left_to_right = np.sqrt((left_wrist[0] - right_ankle[0])**2 + (left_wrist[1] - right_ankle[1])**2)
            right_to_left = np.sqrt((right_wrist[0] - left_ankle[0])**2 + (right_wrist[1] - left_ankle[1])**2)
            right_to_right = np.sqrt((right_wrist[0] - right_ankle[0])**2 + (right_wrist[1] - right_ankle[1])**2)
            
            min_dist = min(left_to_left, left_to_right, right_to_left, right_to_right)
            reach_score = 1.0 if min_dist < 0.15 else max(0.3, 1.0 - (min_dist - 0.15) / 0.3)
    scores.append(reach_score * 0.5)
    
    total_weight = 1.5 + 1.0 + 1.0 + 2.0 + 0.5
    confidence = sum(scores) / total_weight
    
    is_pose = confidence >= 0.60
    return (is_pose, round(confidence, 3))

def _score_angle_in_range(angle, target_min, target_max, buffer=15):
    """
    Returns a score (0.0 to 1.0) for how well an angle fits within a target range.
    Perfect match (within range) = 1.0
    Within buffer zone = partial score
    Outside buffer = 0.0
    """
    if target_min <= angle <= target_max:
        return 1.0
    elif angle < target_min:
        diff = target_min - angle
        if diff <= buffer:
            return 1.0 - (diff / buffer) * 0.5
        return 0.0
    else:  # angle > target_max
        diff = angle - target_max
        if diff <= buffer:
            return 1.0 - (diff / buffer) * 0.5
        return 0.0
