export const calculateAngle = (a, b, c) => {
    // a, b, c are objects with x and y properties
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
};

export const classifyWarrior2 = (leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle) => {
    /* Classifies Warrior 2 pose. */
    const warrior2LeftBent = (leftArmAngle > 160 && leftArmAngle < 200 &&
        rightArmAngle > 160 && rightArmAngle < 200 &&
        leftLegAngle > 80 && leftLegAngle < 110 &&
        rightLegAngle > 160 && rightLegAngle < 200);

    const warrior2RightBent = (leftArmAngle > 160 && leftArmAngle < 200 &&
        rightArmAngle > 160 && rightArmAngle < 200 &&
        rightLegAngle > 80 && rightLegAngle < 110 &&
        leftLegAngle > 160 && leftLegAngle < 200);

    if (warrior2LeftBent || warrior2RightBent) {
        return true;
    }
    return false;
};

export const classifyWarrior1 = (leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftShoulderAngle, rightShoulderAngle) => {
    /* Classifies Warrior 1 pose. */
    // Arms are straight and raised.
    const armsStraight = leftArmAngle > 150 && rightArmAngle > 150;
    const armsUp = leftShoulderAngle > 140 && rightShoulderAngle > 140;

    // One leg bent, one leg straight
    const warrior1LeftBent = (armsStraight && armsUp &&
        leftLegAngle > 80 && leftLegAngle < 120 &&
        rightLegAngle > 160);

    const warrior1RightBent = (armsStraight && armsUp &&
        rightLegAngle > 80 && rightLegAngle < 120 &&
        leftLegAngle > 160);

    if (warrior1LeftBent || warrior1RightBent) {
        return true;
    }
    return false;
};

export const classifyTreePose = (leftLegAngle, rightLegAngle, leftAnkle, rightAnkle, leftKnee, rightKnee) => {
    /* Classifies Tree pose (Vrksasana). */
    // Left leg is standing leg
    const treePoseLeftStanding = (leftLegAngle > 160 && leftLegAngle < 200 &&
        rightLegAngle < 100 &&
        rightAnkle.y < leftKnee.y);

    // Right leg is standing leg
    const treePoseRightStanding = (rightLegAngle > 160 && rightLegAngle < 200 &&
        leftLegAngle < 100 &&
        leftAnkle.y < rightKnee.y);

    if (treePoseLeftStanding || treePoseRightStanding) {
        return true;
    }
    return false;
};

export const classifyTrianglePose = (leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftBodyAngle, rightBodyAngle, leftShoulderAngle, rightShoulderAngle) => {
    /* Classifies Triangle pose (Trikonasana). */
    // Legs should be straight
    const legsStraight = leftLegAngle > 160 && rightLegAngle > 160;

    // Arms should be straight
    const armsStraight = leftArmAngle > 150 && rightArmAngle > 150;

    // Arms raised (approx 90 degrees relative to body, or effectively out)
    // Using shoulder angle (hip-shoulder-wrist)
    const armsOut = leftShoulderAngle > 60 && rightShoulderAngle > 60;

    // Torso bent to one side. 
    // Normal standing is ~180. Triangle involves bending at hip.
    // We check if one side angle is significantly less than 165 indicating a bend.
    const torsoBent = leftBodyAngle < 165 || rightBodyAngle < 165;

    if (legsStraight && armsStraight && armsOut && torsoBent) {
        return true;
    }
    return false;
};

export const classifyMountainPose = (leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftShoulderAngle, rightShoulderAngle) => {
    /* Classifies Mountain pose (Tadasana). */
    // Legs straight
    const legsStraight = leftLegAngle > 170 && rightLegAngle > 170;

    // Arms straight
    const armsStraight = leftArmAngle > 160 && rightArmAngle > 160;

    // Arms down at sides (angle between hip-shoulder-wrist should be small)
    const armsDown = leftShoulderAngle < 30 && rightShoulderAngle < 30;

    if (legsStraight && armsStraight && armsDown) {
        return true;
    }
    return false;
};

export const classifyPlankPose = (leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, shoulderL, ankleL, shoulderR, ankleR) => {
    /* Classifies Plank pose (Phalakasana). */
    // Legs straight
    const legsStraight = leftLegAngle > 160 && rightLegAngle > 160;

    // Arms straight involved in support
    const armsStraight = leftArmAngle > 160 && rightArmAngle > 160;

    // Body roughly horizontal? 
    // Check if vertical distance between shoulder and ankle is small relative to horizontal
    // This assumes side view.
    // If front view, this logic might fail, but plank is usually side view.

    const horizontalL = Math.abs(shoulderL.y - ankleL.y) < Math.abs(shoulderL.x - ankleL.x);
    const horizontalR = Math.abs(shoulderR.y - ankleR.y) < Math.abs(shoulderR.x - ankleR.x);

    if (legsStraight && armsStraight && (horizontalL || horizontalR)) {
        return true;
    }
    return false;
};

export const getPose = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return "Unknown";

    // Helper to get coordinates
    const getCoord = (index) => ({ x: landmarks[index].x, y: landmarks[index].y });

    const shoulderL = getCoord(11);
    const shoulderR = getCoord(12);
    const elbowL = getCoord(13);
    const elbowR = getCoord(14);
    const wristL = getCoord(15);
    const wristR = getCoord(16);
    const hipL = getCoord(23);
    const hipR = getCoord(24);
    const kneeL = getCoord(25);
    const kneeR = getCoord(26);
    const ankleL = getCoord(27);
    const ankleR = getCoord(28);

    // Calculate angles
    const leftArmAngle = calculateAngle(shoulderL, elbowL, wristL);
    const rightArmAngle = calculateAngle(shoulderR, elbowR, wristR);
    const leftLegAngle = calculateAngle(hipL, kneeL, ankleL);
    const rightLegAngle = calculateAngle(hipR, kneeR, ankleR);
    const leftShoulderAngle = calculateAngle(hipL, shoulderL, wristL);
    const rightShoulderAngle = calculateAngle(hipR, shoulderR, wristR);
    const leftBodyAngle = calculateAngle(shoulderL, hipL, kneeL);
    const rightBodyAngle = calculateAngle(shoulderR, hipR, kneeR);

    if (classifyWarrior2(leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle)) {
        return "Warrior 2";
    } else if (classifyWarrior1(leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftShoulderAngle, rightShoulderAngle)) {
        return "Warrior 1";
    } else if (classifyTreePose(leftLegAngle, rightLegAngle, ankleL, ankleR, kneeL, kneeR)) {
        return "Tree Pose";
    } else if (classifyTrianglePose(leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftBodyAngle, rightBodyAngle, leftShoulderAngle, rightShoulderAngle)) {
        return "Triangle Pose";
    } else if (classifyMountainPose(leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, leftShoulderAngle, rightShoulderAngle)) {
        return "Mountain Pose";
    } else if (classifyPlankPose(leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle, shoulderL, ankleL, shoulderR, ankleR)) {
        return "Plank Pose";
    }

    return "Unknown";
};
