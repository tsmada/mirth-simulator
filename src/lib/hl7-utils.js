"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeHL7Segments = exports.insertHL7SegmentAfter = exports.getHL7Segments = exports.createHL7Segment = exports.setHL7Field = exports.getHL7Field = void 0;
function normalizeLineEndings(message) {
    return message.replace(/\r\n|\n|\r/g, '\r');
}
function getHL7Field(message, segment, field, component) {
    if (component === void 0) { component = 0; }
    try {
        message = normalizeLineEndings(message);
        var lines = message.split('\r');
        var segmentLine = lines.find(function (line) { return line.startsWith(segment); });
        if (!segmentLine)
            return '';
        if (segment === 'MSH') {
            if (field === 1)
                return segmentLine[3];
            if (field === 2)
                return segmentLine.substring(3, 8);
            var fields_1 = __spreadArray([
                '',
                ''
            ], segmentLine.substring(8).split('|'), true);
            var fieldValue_1 = fields_1[field];
            if (!fieldValue_1)
                return '';
            if (component > 0) {
                var components = fieldValue_1.split('^');
                return components[component - 1] || '';
            }
            return fieldValue_1;
        }
        var fields = segmentLine.split('|');
        if (field >= fields.length)
            return '';
        var fieldValue = fields[field];
        if (!fieldValue)
            return '';
        if (component > 0) {
            var components = fieldValue.split('^');
            return components[component - 1] || '';
        }
        return fieldValue;
    }
    catch (error) {
        console.error('Error extracting HL7 field:', error);
        return '';
    }
}
exports.getHL7Field = getHL7Field;
function setHL7Field(message, segment, field, value, component) {
    if (component === void 0) { component = 0; }
    try {
        message = normalizeLineEndings(message);
        var lines = message.split('\r');
        var segmentIndex = lines.findIndex(function (line) { return line.startsWith(segment); });
        if (segmentIndex === -1)
            return message;
        if (segment === 'MSH') {
            var segmentLine = lines[segmentIndex];
            if (field === 1) {
                return message;
            }
            if (field === 2) {
                return message;
            }
            var fields_2 = __spreadArray([
                '',
                ''
            ], segmentLine.substring(8).split('|'), true);
            if (component > 0) {
                var components = (fields_2[field] || '').split('^');
                components[component - 1] = value;
                fields_2[field] = components.join('^');
            }
            else {
                fields_2[field] = value;
            }
            lines[segmentIndex] = "MSH|".concat(segmentLine.substring(4, 8)).concat(fields_2.slice(2).join('|'));
            return lines.join('\r');
        }
        var fields = lines[segmentIndex].split('|');
        while (fields.length <= field) {
            fields.push('');
        }
        if (component > 0) {
            var components = (fields[field] || '').split('^');
            while (components.length < component) {
                components.push('');
            }
            components[component - 1] = value;
            fields[field] = components.join('^');
        }
        else {
            fields[field] = value;
        }
        lines[segmentIndex] = fields.join('|');
        return lines.join('\r');
    }
    catch (error) {
        console.error('Error setting HL7 field:', error);
        return message;
    }
}
exports.setHL7Field = setHL7Field;
function createHL7Segment(segmentName, fields) {
    if (fields === void 0) { fields = []; }
    return fields.length > 0 ? "".concat(segmentName, "|").concat(fields.join('|')) : segmentName;
}
exports.createHL7Segment = createHL7Segment;
function getHL7Segments(message, segmentName) {
    try {
        message = normalizeLineEndings(message);
        return message.split('\r').filter(function (line) { return line.startsWith(segmentName); });
    }
    catch (error) {
        logger.error('Error getting HL7 segments:', error);
        return [];
    }
}
exports.getHL7Segments = getHL7Segments;
function insertHL7SegmentAfter(message, newSegment, afterSegment) {
    try {
        message = normalizeLineEndings(message);
        var lines = message.split('\r');
        var segmentIndex = lines.findIndex(function (line) { return line.startsWith(afterSegment); });
        if (segmentIndex === -1)
            return message;
        lines.splice(segmentIndex + 1, 0, newSegment);
        return lines.join('\r');
    }
    catch (error) {
        logger.error('Error inserting HL7 segment:', error);
        return message;
    }
}
exports.insertHL7SegmentAfter = insertHL7SegmentAfter;
function removeHL7Segments(message, segmentName) {
    try {
        message = normalizeLineEndings(message);
        var lines = message.split('\r');
        var filteredLines = lines.filter(function (line) { return !line.startsWith(segmentName); });
        return filteredLines.join('\r');
    }
    catch (error) {
        logger.error('Error removing HL7 segments:', error);
        return message;
    }
}
exports.removeHL7Segments = removeHL7Segments;
