// 导入依赖
const express = require('express');
const path = require('path');
const fs = require('fs');

// 创建一个Express应用程序实例
const app = express();

// 引入JWT(JsonWebToken)中间件
const jwt = require("jsonwebtoken");


 // 定义secret密钥
 const secret = "zanjin";

//用于连接数据库
const mysql = require('mysql2');
//用于对密码进行加密
const bcrypt = require('bcryptjs');

// 引入body-parser中间件，用于解析请求体
const bodyParser = require("body-parser");

/////
const cors = require("cors");
// const express = require("express");
// const app = express();
app.use(cors({
  origin: function(origin, callback) {
    // 允许无源请求（比如移动应用）和指定源
    const allowedOrigins = ['http://localhost:8081'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS政策禁止访问'));
    }
  },
  credentials: true
}));


//////
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 全局路由保护中间件
app.use((req, res, next) => {
  // 添加请求路径日志
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // 定义不需要验证token的公共路由
  const publicRoutes = [
    '/login',
    '/Forgot/password',
    '/register',
    '/api/health'
  ];
  
  // 允许OPTIONS请求通过（用于CORS预检）
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // 检查是否是公共路由或静态资源
  if (publicRoutes.includes(req.path) || 
      req.path.includes('.html') || 
      req.path.includes('.css') || 
      req.path.includes('.js') || 
      req.path.includes('.ico') ||
      req.path.includes('/uploads/')) {
    return next();
  }
  
  // 获取token
  const token = req.headers['x-access-token'];
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '未提供身份验证令牌，请先登录' 
    });
  }
  
  // 验证token
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error(`Token验证失败: ${err.message}`);
      // 如果token过期
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: '登录已过期，请重新登录',
          expired: true
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: '无效的身份验证令牌' 
      });
    }
    
    console.log(`用户验证成功: ID=${decoded.userId}, 角色=${decoded.role}`);
    
    // 将用户信息添加到请求对象中
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.user = {
      id: decoded.userId,
      role: decoded.role
    };
    
    next();
  });
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'come-on-project'
  });

db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is invalid or expired.' });
    }

    if (!decoded.userId) {
      return res.status(401).json({ message: 'User ID not found in token.' });
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role; // 添加角色信息
    next();
  });
};

// 在verifyToken定义后添加authenticateToken中间件 (大约在第39行后)
const authenticateToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Token is invalid or expired.' });
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
};

// 添加multer配置 (大约在初始化部分，第35行后)
const multer = require('multer');

// 确保上传目录存在
const uploadDirs = [
  path.join(__dirname, 'public/uploads'),
  path.join(__dirname, 'public/uploads/avatars')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置Multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDirs[0]);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// 修改获取活动列表API
app.get('/api/activities', verifyToken, (req, res) => {
  const query = `
    SELECT a.*, c.name as club_name, u.username as organizer_name
    FROM activities a
    LEFT JOIN clubs c ON a.club_id = c.id
    LEFT JOIN users u ON c.leader_id = u.id
    
    where a.status = 1
    ORDER BY a.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('获取活动列表失败:', err);
      return res.status(500).json({ success: false, message: '获取活动列表失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log('收到登录请求:', { username, password });
  
  if (!username || !password) {
    console.log('缺少用户名或密码');
    return res.status(400).json({
      success: false,
      message: "用户名和密码为必填项"
    });
  }

  // 查询用户信息
  const query = `
    SELECT u.id, u.username, u.password, u.role, u.avatar, 
           c.id as club_id, c.name as club_name
    FROM users u
    LEFT JOIN clubs c ON c.leader_id = u.id
    WHERE u.username = ?
  `;
  
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("从数据库提取用户时出错:", err);
      return res.status(500).json({
        success: false,
        message: "登录时出错"
      });
    }
    
    console.log('查询结果:', results);
    
    if (results.length === 0) {
      console.log('未找到用户:', username);
      return res.status(404).json({
        success: false,
        message: "未找到用户"
      });
    }
    
    const user = results[0];
    console.log('找到用户:', user);
    
    // 使用 bcryptjs 比较输入的密码和数据库中的哈希密码
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) {
        console.error('密码比较出错:', compareErr);
        return res.status(500).json({
          success: false,
          message: "登录时出错"
        });
      }
      
      if (!isMatch) {
        console.log('密码验证失败');
        return res.status(401).json({
          success: false,
          message: "密码无效"
        });
      }

      // 确保角色值是正确的数字类型
      const userRole = parseInt(user.role);

      // 修改JWT令牌的过期时间（如果需要延长）
      const token = jwt.sign({ 
        userId: user.id,
        role: userRole,
        clubId: user.club_id
      }, secret, { expiresIn: 604800 }); // 延长到7天
      
      console.log('生成的token:', token);
      console.log('用户角色:', userRole);
      
      // 添加默认头像路径（如果用户没有头像）
      let avatar = user.avatar;
      if (!avatar) {
        avatar = '/uploads/avatars/default_2.png';
      }
      
      // 返回用户信息
      res.status(200).json({ 
        success: true, 
        token, 
        role: userRole,
        userInfo: {
          id: user.id,
          username: user.username,
          role: userRole,
          clubId: user.club_id,
          clubName: user.club_name,
          avatar: avatar
        },
        message: '登录成功',
        // 根据不同角色设置不同的重定向路径
        redirectTo: userRole === 0 ? '/admin/dashboard' : 
                   userRole === 2 ? '/student/activity-stats' : '/dashboard'  // 社长(2)重定向到activity-stats页面
      });
    });
  });
});

// ... existing code ...

// 处理忘记密码请求的路由
app.post('/Forgot/password', (req, res) => {
  const { username, phone, email } = req.body;

  // 验证必填字段
  if (!username || !phone || !email) {
    return res.status(400).json({
      success: false,
      message: "用户名、手机号和邮箱均为必填项"
    });
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "请输入有效的手机号"
    });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "请输入有效的邮箱"
    });
  }

  console.log('收到忘记密码请求:', { username, phone, email });

  // 修改查询语句，从 users 表获取 phone 和 email，从 current_password 表获取 is_forgotten
  const query = `
    SELECT u.phone, u.email, cp.is_forgotten 
    FROM users u
    LEFT JOIN current_password cp ON u.username = cp.username
    WHERE u.username = ?
  `;
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error("查询用户信息时出错:", err);
      return res.status(500).json({
        success: false,
        message: "处理忘记密码请求时出错"
      });
    }

    if (results.length === 0) {
      // 用户名不存在
      return res.status(404).json({
        success: false,
        message: "用户不存在"
      });
    }

  console.log('results:',results[0],);

    const { phone: existingPhone, email: existingEmail } = results[0];

    // 使用查询到的 existingIsForgotten 进行判断
    if (phone === existingPhone && email === existingEmail ) {
      // 更新 current_password 表中的 is_forgotten 字段
      const insertQuery = "INSERT INTO current_password (username, is_forgotten) VALUES (?, 1) ON DUPLICATE KEY UPDATE is_forgotten = 1";
      db.query(insertQuery, [username], (insertErr, insertResults) => {
        if (insertErr) {
          console.error("将用户添加到 current_password 表时出错:", insertErr);
          return res.status(500).json({
            success: false,
            message: "处理忘记密码请求时出错"
          });
        }

        // 返回成功响应
        return res.status(200).json({
          success: true,
          message: "忘记密码请求已成功处理"
        });
      });
    } else {
      // 提供的 phone 或 email 不匹配，或者 is_forgotten 已经是 1
      return res.status(400).json({
        success: false,
        message: "提供的手机号或邮箱不匹配，或者忘记密码请求已处理"
      });
    }
  });
});

// ... existing code ...


// 处理重置密码请求的路由
// 路由 1: 查看 users 表中的 is_forgotten 为 1 的 username
app.get('/ischange/password',verifyToken,  (req, res) => {
  const query = 'SELECT username FROM current_password WHERE is_forgotten = 1';
  db.query(query, (err, results) => {
    if (err) {
      console.error('查询忘记密码用户列表失败:', err);
      return res.status(500).json({ error: '查询忘记密码用户列表失败' });
    }
    const usernames = results.map(row => row.username);
    res.json(usernames);
  });
});



// ... existing code ...

app.post('/ischange/password', verifyToken, async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: '缺少必要的参数: username' });
  }

  // 固定密码为 123456
  const newPassword = '123456';

  try {
    // 对密码进行哈希加密
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新 users 表的 password 字段
    const updateUsersQuery = 'UPDATE users SET password = ? WHERE username = ?';
    db.query(updateUsersQuery, [hashedPassword, username], (usersErr, usersResults) => {
      if (usersErr) {
        console.error('重置用户密码失败:', usersErr);
        return res.status(500).json({ error: '重置用户密码失败' });
      }

      // 更新 current_password 表的 is_forgotten 字段
      const updateCurrentPasswordQuery = 'UPDATE current_password SET is_forgotten = 0 WHERE username = ?';
      db.query(updateCurrentPasswordQuery, [username], (currentPasswordErr, currentPasswordResults) => {
        if (currentPasswordErr) {
          console.error('更新 current_password 表失败:', currentPasswordErr);
          return res.status(500).json({ error: '更新 current_password 表失败' });
        }

        if (usersResults.affectedRows === 0 || currentPasswordResults.affectedRows === 0) {
          return res.status(404).json({ error: '未找到用户' });
        }

        res.json({ message: `用户 ${username} 密码重置成功，新密码为: ${newPassword}` });
      });
    });
  } catch (error) {
    console.error('密码哈希失败:', error);
    return res.status(500).json({ error: '密码哈希失败' });
  }
});


// 提供 HTML 页面
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});



app.get('/me', (req, res) => {
    res.sendFile(path.join(__dirname, 'me.html'));
});

// 创建活动
app.post('/api/activities', verifyToken, (req, res) => {
  const {
    title,
    description,
    club_id,
    start_time,
    end_time,
    location,
    max_participants,
    status = 0,
    points = 0,
    tags = '',
    contact = '',
    registration_time // 新增字段
  } = req.body;

  // ... existing code ...

// 转换日期格式，加上 8 个小时
const eightHoursInMilliseconds = 8 * 60 * 60 * 1000;
const formattedStartTime = start_time ? new Date(new Date(start_time).getTime() + eightHoursInMilliseconds).toISOString().slice(0, 19).replace('T', ' ') : null;
const formattedEndTime = end_time ? new Date(new Date(end_time).getTime() + eightHoursInMilliseconds).toISOString().slice(0, 19).replace('T', ' ') : null;
const formattedRegistrationTime = registration_time ? new Date(new Date(registration_time).getTime() + eightHoursInMilliseconds).toISOString().slice(0, 19).replace('T', ' ') : null; // 格式化报名时间

// ... existing code ...
  // SQL插入查询
  const insertQuery = `
    INSERT INTO activities 
    (title, description, club_id, start_time, end_time, location, max_participants, status, points, tags, contact, registration_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // 使用转换后的格式
  db.query(
    insertQuery,
    [
      title, 
      description, 
      club_id, 
      formattedStartTime, 
      formattedEndTime, 
      location, 
      max_participants, 
      status, 
      points, 
      tags, 
      contact,
      formattedRegistrationTime // 新增字段
    ],
    (err, result) => {
      if (err) {
        console.error('创建活动失败:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      res.json({
        success: true,
        message: '活动创建成功',
        data: { id: result.insertId }
      });
    }
  );
});

// 删除活动
app.delete('/api/activities/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  // 首先删除与该活动相关的所有参与记录
  const deleteParticipantsQuery = 'DELETE FROM activity_participants WHERE activity_id = ?';
  
  db.query(deleteParticipantsQuery, [id], (participantsErr) => {
    if (participantsErr) {
      console.error('删除活动参与记录失败:', participantsErr);
      return res.status(500).json({ success: false, message: '删除活动失败' });
    }
    
    // 然后删除活动本身
    const deleteActivityQuery = 'DELETE FROM activities WHERE id = ?';
    
    db.query(deleteActivityQuery, [id], (activityErr, result) => {
      if (activityErr) {
        console.error('删除活动失败:', activityErr);
        return res.status(500).json({ success: false, message: '删除活动失败' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '活动不存在' });
      }
      
      res.status(200).json({
        success: true,
        message: '活动删除成功'
      });
    });
  });
});

// 获取我的活动
app.get('/api/activities/my', verifyToken, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const userId = req.userId; // 从token中获取userid

  // 合并查询，直接获取用户报名的活动信息和总数
  const query = `
    SELECT SQL_CALC_FOUND_ROWS a.*, c.name as club_name, u.username as organizer  
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    JOIN clubs c ON a.club_id = c.id
    JOIN users u ON c.leader_id = u.id
    WHERE ap.user_id = ?
    ORDER BY a.start_time DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = 'SELECT FOUND_ROWS() as total';

  db.query(query, [userId, limit, offset], (error, results) => {
    if (error) {
      console.error('Activities query error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    db.query(countQuery, (err, countResults) => {
      if (err) {
        console.error('Count query error:', err);
        return res.status(500).json({ success: false, message: err.message });
      }

      const totalPages = Math.ceil(countResults[0].total / limit);

      console.log('Returning activities data:', results);

      res.json({
        success: true,
        data: results,
        totalPages: totalPages,
        currentPage: page
      });
    });
  });
});

// 创建活动
app.post('/activities', verifyToken, (req, res) => {
  const userId = req.userId; // 从 JWT 中获取

  // 通过 userId 获取对应的 role
  const getRoleQuery = 'SELECT role FROM users WHERE id = ?';
  db.query(getRoleQuery, [userId], (err, results) => {
    if (err) {
      console.error('从数据库获取用户角色时出错:', err);
      return res.status(500).send('获取用户角色时出错.');
    }
    if (results.length === 0) {
      return res.status(404).send('未找到用户.');
    }
    const userRole = results[0].role;

    // 检查 role 是否为 0
    if (userRole!== 0) {
      return res.status(403).json({ success: false, message: '用户角色不为 0，无权限创建活动' });
    }

    // 从请求体中获取数据，新增 tags 和 contact 字段
    const { title, description, date, location, points, club_id, tags, contact, participant_count_max } = req.body;

    // 验证必填字段
    if (!title || !date || !club_id) {
      return res.status(400).json({ success: false, message: '标题、日期和社团 ID 为必填项' });
    }

    // 插入数据，新增 tags 和 contact 字段
    const query = `
      INSERT INTO activities (title, description, date, location, points, club_id, created_by, tags, contact, participant_count_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query, 
      [title, description, date, location, points, club_id, userId, tags, contact,participant_count_max],
      (error, results) => {
        if (error) {
          return res.status(500).json({ success: false, message: error.message });
        }

        res.status(201).json({
          success: true,
          message: '活动创建成功',
          data: { id: results.insertId }
        });
      }
    );
  });
});

// 参加活动
app.post('/activities/:activityId/signup', verifyToken, (req, res) => {
  const activityId = req.params.activityId;
  const userId = req.userId; // 从 JWT 中获取用户 ID

  // 先查询活动的最大参与人数和当前参与人数
  const queryActivity = 'SELECT participant_count_max, participant_count FROM activities WHERE id = ?';
  db.query(queryActivity, [activityId], (activityError, activityResults) => {
    if (activityError) {
      console.error('查询活动信息时出错:', activityError);
      return res.status(500).json({ success: false, message: '查询活动信息时出错' });
    }

    if (activityResults.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该活动' });
    }

    const { participant_count_max, participant_count } = activityResults[0];

    // 检查是否达到最大参与人数
    if (participant_count >= participant_count_max) {
      return res.status(400).json({ success: false, message: '该活动已达到最大参与人数，无法报名' });
    }

    // 检查用户是否已经报名该活动
    const checkQuery = 'SELECT * FROM signups WHERE activity_id = ? AND user_id = ?';
    db.query(checkQuery, [activityId, userId], (checkError, checkResults) => {
      if (checkError) {
        console.error('检查用户报名状态时出错:', checkError);
        return res.status(500).json({ success: false, message: '检查报名状态时出错' });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ success: false, message: '您已经报名了这个活动' });
      }

      // 插入报名记录
      const insertQuery = 'INSERT INTO signups (activity_id, user_id) VALUES (?, ?)';
      db.query(insertQuery, [activityId, userId], (insertError, insertResults) => {
        if (insertError) {
          console.error('报名活动时出错:', insertError);
          return res.status(500).json({ success: false, message: '报名活动时出错' });
        }

        // 更新活动的参与人数
        const updateQuery = 'UPDATE activities SET participant_count = participant_count + 1 WHERE id = ?';
        db.query(updateQuery, [activityId], (updateError, updateResults) => {
          if (updateError) {
            console.error('更新活动参与人数时出错:', updateError);
            return res.status(500).json({ success: false, message: '更新活动参与人数时出错' });
          }

          res.json({ success: true, message: '报名成功' });
        });
      });
    });
  });
});


// 退出活动
app.post('/activities/:activityId/withdraw', verifyToken, (req, res) => {
  const activityId = req.params.activityId;
  const userId = req.userId; // 从 JWT 中获取用户 ID

  // 检查用户是否已经报名该活动
  const checkQuery = 'SELECT * FROM signups WHERE activity_id = ? AND user_id = ?';
  db.query(checkQuery, [activityId, userId], (checkError, checkResults) => {
    if (checkError) {
      console.error('检查用户报名状态时出错:', checkError);
      return res.status(500).json({ success: false, message: '检查报名状态时出错' });
    }

    if (checkResults.length === 0) {
      return res.status(400).json({ success: false, message: '您没有报名这个活动，无法退出' });
    }

    // 删除报名记录
    const deleteQuery = 'DELETE FROM signups WHERE activity_id = ? AND user_id = ?';
    db.query(deleteQuery, [activityId, userId], (deleteError, deleteResults) => {
      if (deleteError) {
        console.error('退出活动时出错:', deleteError);
        return res.status(500).json({ success: false, message: '退出活动时出错' });
      }

      // 若删除报名记录成功，将活动的参与人数减一
      const updateQuery = 'UPDATE activities SET participant_count = participant_count - 1 WHERE id = ?';
      db.query(updateQuery, [activityId], (updateError, updateResults) => {
        if (updateError) {
          console.error('更新活动参与人数时出错:', updateError);
          return res.status(500).json({ success: false, message: '更新活动参与人数时出错' });
        }

        res.json({ success: true, message: '退出活动成功' });
      });
    });
  });
});


// 积分管理API
// 分配积分
app.post('/points/assign', verifyToken, (req, res) => {
  // 验证用户是否有权限分配积分（管理员或社长）
  const checkRoleQuery = `SELECT role FROM users WHERE id = ?`;
  
  db.query(checkRoleQuery, [req.userId], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const userRole = results[0].role;
    if (userRole !== 'admin' && userRole !== 'leader') {
      return res.status(403).json({ 
        success: false, 
        message: '您没有权限分配积分' 
      });
    }
    
    // 从请求体中获取数据
    const { user_id, activity_id, points, description } = req.body;
    
    // 验证必填字段
    if (!user_id || !points) {
      return res.status(400).json({ 
        success: false, 
        message: '用户ID和积分为必填项' 
      });
    }
    
    // 插入积分记录
    const insertQuery = `
      INSERT INTO points (user_id, activity_id, points, description, assigned_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.query(
      insertQuery, 
      [user_id, activity_id, points, description, req.userId],
      (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, message: err.message });
        }
        
        res.json({
          success: true,
          message: '积分分配成功',
          data: { id: result.insertId }
        });
      }
    );
  });
});

app.get('/api/points-ranking', verifyToken, (req, res) => {
  const userId = req.userId;

  // 查询所有用户的剩余积分并按从高到低排序
  const rankingQuery = `
    SELECT 
      u.id,
      u.username,
      ((COALESCE((SELECT SUM(p.points) FROM points p WHERE p.user_id = u.id), 0) - 
       COALESCE((SELECT SUM(per.points) FROM points_exchange_records per JOIN products pr ON per.product_id = pr.id WHERE per.user_id = u.id), 0))) AS remaining_points
    FROM 
      users u
    ORDER BY 
      remaining_points DESC
  `;

  db.query(rankingQuery, (err, rankingResults) => {
    if (err) {
      console.error('获取积分排行榜失败:', err);
      return res.status(500).json({ success: false, message: '获取积分排行榜失败' });
    }

    // 找到当前用户的排名和剩余积分
    let userRank = null;
    let userRemainingPoints = null;
    for (let i = 0; i < rankingResults.length; i++) {
      if (rankingResults[i].id === userId) {
        userRank = i + 1; // 排名从1开始
        userRemainingPoints = rankingResults[i].remaining_points; // 当前用户的剩余积分
        console.log("userRemainingPoints:", userRemainingPoints);
        break;
      }
    }

    // 构造返回的排行榜数据，确保包含每位用户的剩余积分
    const formattedRanking = rankingResults.map((user) => ({
      id: user.id,
      username: user.username,
      remainingPoints: user.remaining_points // 明确返回剩余积分字段
    }));
    console.log("formattedRanking:", formattedRanking);

    res.status(200).json({
      success: true,
      data: {
        ranking: formattedRanking, // 返回格式化后的排行榜数据
        userRank: userRank,
        userRemainingPoints: userRemainingPoints // 返回当前用户的剩余积分
      }
    });
  });
});

// 获取个人积分历史
app.get('/points/history', verifyToken, (req, res) => {
  const userId = req.userId;
  
  const query = `
    SELECT p.*, a.title as activity_title, u.username as assigned_by_name
    FROM points p
    LEFT JOIN activities a ON p.activity_id = a.id
    LEFT JOIN users u ON p.assigned_by = u.id
    WHERE p.user_id = ?
    ORDER BY p.assigned_at DESC
  `;
  
  db.query(query, [userId], (error, results) => {
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    
    res.json({
      success: true,
      data: results
    });
  });
});


// 获取统计数据
app.get('/api/stats', verifyToken, (req, res) => {
  // 获取用户总数（包括所有学生和社长，排除管理员）
  const usersQuery = 'SELECT COUNT(*) as count FROM users WHERE role != 0';
  // 获取活动总数
  const activitiesQuery = 'SELECT COUNT(*) as count FROM activities';
  // 获取社团总数
  const clubsQuery = 'SELECT COUNT(*) as count FROM clubs';

  db.query(usersQuery, (err, usersResult) => {
    if (err) {
      console.error('获取用户统计失败:', err);
      return res.status(500).json({ success: false, message: '获取统计数据失败' });
    }

    db.query(activitiesQuery, (err, activitiesResult) => {
      if (err) {
        console.error('获取活动统计失败:', err);
        return res.status(500).json({ success: false, message: '获取统计数据失败' });
      }

      db.query(clubsQuery, (err, clubsResult) => {
        if (err) {
          console.error('获取社团统计失败:', err);
          return res.status(500).json({ success: false, message: '获取统计数据失败' });
        }

        res.status(200).json({
          success: true,
          data: {
            students: usersResult[0].count,
            activities: activitiesResult[0].count,
            clubs: clubsResult[0].count
          }
        });
      });
    });
  });
});

// 获取统计数据趋势
app.get('/api/stats/trend', verifyToken, (req, res) => {
  // 获取过去7天的数据趋势
  const trendQuery = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM activities
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const usersQuery = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM users
    WHERE role != 0 AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const clubsQuery = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM clubs
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  // 初始化日期数组，包含过去7天
  const dates = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  // 查询活动趋势
  db.query(trendQuery, (err, activitiesResult) => {
    if (err) {
      console.error('获取活动趋势失败:', err);
      return res.status(500).json({ success: false, message: '获取趋势数据失败' });
    }

    // 查询用户趋势
    db.query(usersQuery, (err, usersResult) => {
      if (err) {
        console.error('获取用户趋势失败:', err);
        return res.status(500).json({ success: false, message: '获取趋势数据失败' });
      }

      // 查询社团趋势
      db.query(clubsQuery, (err, clubsResult) => {
        if (err) {
          console.error('获取社团趋势失败:', err);
          return res.status(500).json({ success: false, message: '获取趋势数据失败' });
        }

        // 将SQL结果转换为映射对象，以便于查找
        const activitiesByDate = {};
        const usersByDate = {};
        const clubsByDate = {};

        activitiesResult.forEach(row => {
          activitiesByDate[row.date] = row.count;
        });

        usersResult.forEach(row => {
          usersByDate[row.date] = row.count;
        });

        clubsResult.forEach(row => {
          clubsByDate[row.date] = row.count;
        });

        // 构建最终返回的数据
        const trendData = dates.map(date => {
          return {
            date,
            activities: activitiesByDate[date] || 0,
            students: usersByDate[date] || 0,
            clubs: clubsByDate[date] || 0
          };
        });

        res.status(200).json({
          success: true,
          data: trendData
        });
      });
    });
  });
});

// 获取社团活动统计数据
app.get('/api/clubs/activity-stats', verifyToken, (req, res) => {
  const query = `
    SELECT 
      c.name,
      COUNT(a.id) as value
    FROM clubs c
    LEFT JOIN activities a ON c.id = a.club_id
    GROUP BY c.id, c.name
    ORDER BY value DESC
    LIMIT 10
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('获取社团活动统计失败:', err);
      return res.status(500).json({ success: false, message: '获取社团活动统计失败' });
    }

    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 获取待审批活动
app.get('/api/activities/pending', verifyToken, (req, res) => {
  const query = `
    SELECT a.*, c.name as club_name, u.username as organizer_name
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    JOIN users u ON c.leader_id = u.id
    WHERE a.status = 0
    ORDER BY a.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('获取待审批活动失败:', err);
      return res.status(500).json({ success: false, message: '获取待审批活动失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});
// 管理员获取所有活动
app.get('/api/admin/activities', verifyToken, (req, res) => {
  // 检查用户角色是否为管理员
  if (req.userRole !== 0) {
    return res.status(403).json({ 
      success: false, 
      message: '只有管理员可以访问此接口' 
    });
  }
  
  const query = `
    SELECT a.*, c.name as club_name, u.username as organizer_name,
           CASE 
             WHEN a.status = 0 THEN '待审核'
             WHEN a.status = 1 THEN '已通过'
             WHEN a.status = 2 THEN '已拒绝'
             ELSE '未知'
           END as status_text
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    JOIN users u ON c.leader_id = u.id
    ORDER BY a.created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('获取所有活动失败:', err);
      return res.status(500).json({ success: false, message: '获取所有活动失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// ... existing code ...

// 添加审批活动接口
app.post('/api/activities/:id/approve', verifyToken, (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  
  // 检查用户角色是否为管理员
  if (req.userRole !== 0) {
    return res.status(403).json({ 
      success: false, 
      message: '只有管理员可以审批活动' 
    });
  }

  // 更新活动状态
  let query = 'UPDATE activities SET status = ?';
  let params = [status];
  
  query += ' WHERE id = ?';
  params.push(id);
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('审批活动失败:', err);
      return res.status(500).json({ 
        success: false, 
        message: '审批活动失败' 
      });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该活动' 
      });
    }

    if (status === 2 && reason) {
      const insertRejectionQuery = `
        INSERT INTO rejection (activitie_id, rejection_reason)
        VALUES (?, ?)
      `;
      db.query(insertRejectionQuery, [id, reason], (rejectionErr) => {
        if (rejectionErr) {
          console.error('插入拒绝记录失败:', rejectionErr);
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: status === 1 ? '活动已通过' : '活动已拒绝'
    });
  });
});


// 获取用户列表
app.get('/api/users', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.username,
      u.role,
      u.email,
      u.phone,
      u.department,
      u.major,
      u.grade,
      u.class,
      u.address,
      u.bio,
      u.avatar,
      u.created_at,
      u.updated_at,
      GROUP_CONCAT(DISTINCT c.name) as club_names
    FROM users u
    LEFT JOIN club_members cm ON u.id = cm.user_id
    LEFT JOIN clubs c ON cm.club_id = c.id
    GROUP BY u.id
    ORDER BY u.id
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('获取用户列表失败:', err);
      return res.status(500).json({ success: false, message: '获取用户列表失败' });
    }
    res.json({ success: true, data: results });
    console.log('获取用户列表成功');
    console.log('显示用户：', results);

  });
});
// ... existing code ...

app.post('/api/users', (req, res) => {
  const { 
    username, 
    email, 
    phone, 
    department, 
    major, 
    grade, 
    class: userClass, // 注意 'class' 是 JavaScript 关键字，需要重命名
    address, 
    bio, 
    avatar,
    created_at,
    updated_at
  } = req.body;

  // 验证必填字段
  if (!username || !email || !phone) {
    return res.status(400).json({
      success: false,
      message: "用户名、邮箱和电话为必填项"
    });
  }

  // 随机生成 6 位数字密码
  const password = Math.floor(100000 + Math.random() * 900000).toString();
  const role = 2;

  // 插入用户信息到数据库
  const insertQuery = `
    INSERT INTO users (
      username, 
      password, 
      role, 
      email, 
      phone, 
      department, 
      major, 
      grade, 
      class, 
      address, 
      bio, 
      avatar,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertQuery,
    [
      username, 
      password, 
      role, 
      email, 
      phone, 
      department, 
      major, 
      grade, 
      userClass, 
      address, 
      bio, 
      avatar,
      created_at,
      updated_at
    ],
    (err, results) => {
      if (err) {
        console.error('添加用户失败:', err);
        return res.status(500).json({
          success: false,
          message: '添加用户失败'
        });
      }

      res.status(200).json({
        success: true,
        message: '用户添加成功',
        userId: results.insertId
      });
    }
  );
});

// ... existing code ...

// 更新用户
app.put('/api/users/:id', verifyToken, (req, res) => {
  const { username, role } = req.body;
  const { id } = req.params;
  const sql = 'UPDATE users SET username = ? WHERE id = ?';
  
  db.query(sql, [username, id], (err, result) => {
    if (err) {
      console.error('更新用户失败:', err);
      return res.status(500).json({ success: false, message: '更新用户失败' });
    }
    res.json({ success: true, message: '用户更新成功' });
  });
});

// 删除用户
app.delete('/api/users/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  // 查询用户角色
  const checkRoleQuery = 'SELECT role FROM users WHERE id = ?';
  db.query(checkRoleQuery, [id], (roleErr, roleResults) => {
    if (roleErr) {
      console.error('查询用户角色失败:', roleErr);
      return res.status(500).json({ success: false, message: '查询用户角色失败' });
    }

    if (roleResults.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该用户' });
    }

    const userRole = roleResults[0].role;
    if (userRole === 0 || userRole === 2) {
      return res.status(403).json({ success: false, message: '该用户权限不是学生，不可进行删除操作' });
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('删除用户失败:', err);
        return res.status(500).json({ success: false, message: '删除用户失败' });
      }
      res.json({ success: true, message: '用户删除成功' });
    });
  });
});


// ... existing code ...

// 获取用户角色列表
app.get('/api/roles', verifyToken, (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.username,
      u.bio,
      u.role,
      u.created_at,
      u.updated_at
    FROM users u
    LEFT JOIN club_members cm ON u.id = cm.user_id
    LEFT JOIN clubs c ON cm.club_id = c.id
    GROUP BY u.id
    ORDER BY u.id
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('获取用户列表失败:', err);
      return res.status(500).json({ success: false, message: '获取用户列表失败' });
    }

    // 添加角色名称映射
    const roleMap = {
      0: '管理员',
      1: '学生',
      2: '社长'
    };

    const formattedResults = results.map(user => {
      return {
        ...user,
        roleName: roleMap[user.role] || '未知角色'
      };
    });

    res.json({ success: true, data: formattedResults });
    console.log('获取用户列表成功');
    console.log('显示用户：', formattedResults);
  });
});

// ... existing code ...


// 获取活动统计
app.get('/api/activities/stats', verifyToken, (req, res) => {
  const userRole = req.userRole;
  const userId = req.userId;
  
  // 根据角色确定SQL查询条件
  let whereClause = '';
  const queryParams = [];
  
  if (userRole === 2) { // 社长角色
    whereClause = 'WHERE c.leader_id = ?';
    queryParams.push(userId);
  } else if (userRole !== 0) { // 不是管理员也不是社长
    return res.status(403).json({ 
      success: false, 
      message: '没有权限查看活动统计' 
    });
  }
  
  // 获取活动列表及参与情况
  const activitiesQuery = `
    SELECT a.*, c.name as club_name,
    (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) as participant_count
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    ${whereClause}
    ORDER BY a.start_time DESC
  `;
  
  // 获取活动总数
  const totalActivitiesQuery = `
    SELECT COUNT(*) as count
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    ${whereClause}
  `;
  
  // 获取总参与人次
  const totalParticipantsQuery = `
    SELECT COUNT(*) as count
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    JOIN clubs c ON a.club_id = c.id
    ${whereClause}
  `;
  
  // 获取平均完成率
  const completionRateQuery = `
    SELECT AVG(
      (SELECT COUNT(*) FROM activity_participants WHERE activity_id = a.id) / a.max_participants * 100
    ) as rate
    FROM activities a
    JOIN clubs c ON a.club_id = c.id
    ${whereClause}
    AND a.max_participants > 0
  `;
  
  db.query(activitiesQuery, queryParams, (err, activitiesResults) => {
    if (err) {
      console.error('获取活动统计失败:', err);
      return res.status(500).json({ success: false, message: '获取活动统计失败' });
    }
    
    db.query(totalActivitiesQuery, queryParams, (err, totalActivitiesResults) => {
      if (err) {
        console.error('获取活动总数失败:', err);
        return res.status(500).json({ success: false, message: '获取活动统计失败' });
      }
      
      db.query(totalParticipantsQuery, queryParams, (err, totalParticipantsResults) => {
        if (err) {
          console.error('获取总参与人次失败:', err);
          return res.status(500).json({ success: false, message: '获取活动统计失败' });
        }
        
        db.query(completionRateQuery, queryParams, (err, completionRateResults) => {
          if (err) {
            console.error('获取平均完成率失败:', err);
            return res.status(500).json({ success: false, message: '获取活动统计失败' });
          }
          
          res.status(200).json({
            success: true,
            data: {
              activities: activitiesResults,
              total_activities: totalActivitiesResults[0].count,
              total_participants: totalParticipantsResults[0].count,
              completion_rate: completionRateResults[0].rate || 0
            }
          });
        });
      });
    });
  });
});
// 获取用户报名的活动
app.get('/api/activities/signups', verifyToken, (req, res) => {
  const query = `
    SELECT activity_id, user_id, status, created_at
    FROM activity_participants
    WHERE user_id = ?
  `;
  
  db.query(query, [req.userId], (err, results) => {
    if (err) {
      console.error('获取报名记录失败:', err);
      return res.status(500).json({ success: false, message: '获取报名记录失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 报名活动
app.post('/api/activities/:id/signup', verifyToken, (req, res) => {
  const { id } = req.params;
  
  // 检查活动是否存在且状态为已通过
  const checkActivityQuery = `
    SELECT status, max_participants, 
    (SELECT COUNT(*) FROM activity_participants WHERE activity_id = ?) as participant_count
    FROM activities 
    WHERE id = ?
  `;
  
  db.query(checkActivityQuery, [id, id], (err, activityResults) => {
    if (err) {
      console.error('检查活动状态失败:', err);
      return res.status(500).json({ success: false, message: '报名失败' });
    }
    
    if (activityResults.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '活动不存在' 
      });
    }
    
    const activity = activityResults[0];
    
    if (activity.status !== 1) {
      return res.status(400).json({ 
        success: false, 
        message: '只能报名已通过的活动' 
      });
    }
    
    if (activity.participant_count >= activity.max_participants) {
      return res.status(400).json({ 
        success: false, 
        message: '活动报名人数已满' 
      });
    }
    
    // 检查用户是否已报名
    const checkSignupQuery = 'SELECT * FROM activity_participants WHERE activity_id = ? AND user_id = ?';
    db.query(checkSignupQuery, [id, req.userId], (err, signupResults) => {
      if (err) {
        console.error('检查报名记录失败:', err);
        return res.status(500).json({ success: false, message: '报名失败' });
      }
      
      if (signupResults.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: '您已经报名过该活动' 
        });
      }
      
      // 插入报名记录
      const insertQuery = 'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, 1)';
      db.query(insertQuery, [id, req.userId], (err, result) => {
        if (err) {
          console.error('创建报名记录失败:', err);
          return res.status(500).json({ success: false, message: '报名失败' });
        }
        
        res.status(201).json({
          success: true,
          message: '报名成功',
          data: { id: result.insertId }
        });
      });
    });
  });
});


// 获取社团列表
app.get('/api/clubs', verifyToken, (req, res) => {
  const sql = `
    SELECT c.*, u.username as leader_name,
           u.email as leader_email, 
           u.phone as leader_phone,
           u.department as leader_department
    FROM clubs c 
    LEFT JOIN users u ON c.leader_id = u.id
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('获取社团列表失败:', err);
      return res.status(500).json({ success: false, message: '获取社团列表失败' });
    }
    res.json({ success: true, data: results });
  });
});

// 创建社团 API
app.post('/api/clubs', verifyToken, (req, res) => {
  const { name, description, leader_id } = req.body;

  // 验证必填字段
  if (!name || !leader_id) {
    return res.status(400).json({
      success: false,
      message: "社团名称和社长 ID 为必填项"
    });
  }

  // 插入社团信息到数据库
  const insertQuery = `
    INSERT INTO clubs (name, description, leader_id)
    VALUES (?, ?, ?)
  `;

  db.query(
    insertQuery,
    [name, description, leader_id],
    (err, results) => {
      if (err) {
        console.error('创建社团失败:', err);
        return res.status(500).json({
          success: false,
          message: '创建社团失败'
        });
      }

      // 添加：更新用户角色为 2
      const updateRoleQuery = `
        UPDATE users
        SET role = 2
        WHERE id = ?
      `;
      db.query(updateRoleQuery, [leader_id], (updateErr) => {
        if (updateErr) {
          console.error('更新用户角色失败:', updateErr);
          // 即使更新角色失败，社团创建已成功，可选择返回提示信息
          return res.status(201).json({
            success: true,
            message: '社团创建成功，但更新社长角色失败',
            clubId: results.insertId
          });
        }

        res.status(201).json({
          success: true,
          message: '社团创建成功',
          clubId: results.insertId
        });
      });
    }
  );
});

// 更新社团信息
app.put('/api/clubs/:id', verifyToken, (req, res) => {
  const clubId = req.params.id;
  const { name, description, leader_id } = req.body;

  // 验证必填字段（可根据实际需求调整）
  if (!name || !leader_id) {
    return res.status(400).json({
      success: false,
      message: "社团名称和社长 ID 为必填项"
    });
  }

  // 先获取原社长 ID
  const getOriginalLeaderQuery = `
    SELECT leader_id FROM clubs WHERE id = ?
  `;
  db.query(getOriginalLeaderQuery, [clubId], (getErr, originalLeaderResults) => {
    if (getErr) {
      console.error('获取原社长 ID 失败:', getErr);
      return res.status(500).json({ success: false, message: '更新社团信息失败' });
    }

    const originalLeaderId = originalLeaderResults[0]?.leader_id;

    // 构建更新查询语句
    const updateQuery = `
      UPDATE clubs
      SET name = ?, description = ?, leader_id = ?
      WHERE id = ?
    `;

    // 执行数据库更新操作
    db.query(
      updateQuery,
      [name, description, leader_id, clubId],
      (err, result) => {
        if (err) {
          console.error('更新社团信息失败:', err);
          return res.status(500).json({ success: false, message: '更新社团信息失败' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: '未找到该社团' });
        }

        // 将新社长的角色设置为 2
        const updateNewLeaderRoleQuery = `
          UPDATE users
          SET role = 2
          WHERE id = ?
        `;
        db.query(updateNewLeaderRoleQuery, [leader_id], (updateNewErr) => {
          if (updateNewErr) {
            console.error('更新新社长角色失败:', updateNewErr);
            // 即使更新失败，社团信息已更新，可选择返回提示信息
          }

          // 检查是否还有其他社团以原社长为 leader
          if (originalLeaderId && originalLeaderId !== leader_id) {
            const checkOriginalLeaderQuery = `
              SELECT id FROM clubs WHERE leader_id = ?
            `;
            db.query(checkOriginalLeaderQuery, [originalLeaderId], (checkErr, checkResults) => {
              if (checkErr) {
                console.error('检查原社长是否仍为其他社团社长失败:', checkErr);
                // 即使检查失败，社团信息已更新，可选择返回提示信息
              }

              if (checkResults.length === 0) {
                // 若不存在，则将原社长的角色设置为 1
                const updateOriginalLeaderRoleQuery = `
                  UPDATE users
                  SET role = 1
                  WHERE id = ?
                `;
                db.query(updateOriginalLeaderRoleQuery, [originalLeaderId], (updateOriginalErr) => {
                  if (updateOriginalErr) {
                    console.error('更新原社长角色失败:', updateOriginalErr);
                    // 即使更新失败，社团信息已更新，可选择返回提示信息
                  }
                });
              }
            });
          }

          res.json({
            success: true,
            message: '社团信息更新成功',
            data: { id: clubId }
          });
        });
      }
    );
  });
});

// 删除社团 API
app.delete('/api/clubs/:id', verifyToken, (req, res) => {
  const clubId = req.params.id;

  // 检查用户角色是否为管理员，只有管理员能删除社团
  if (req.userRole !== 0) {
    return res.status(403).json({ 
      success: false, 
      message: '只有管理员可以删除社团' 
    });
  }

  // 执行删除社团的操作
  const deleteQuery = 'DELETE FROM clubs WHERE id = ?';
  db.query(deleteQuery, [clubId], (err, result) => {
    if (err) {
      console.error('删除社团失败:', err);
      return res.status(500).json({ 
        success: false, 
        message: '删除社团失败' 
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该社团' 
      });
    }

    res.status(200).json({
      success: true,
      message: '社团删除成功'
    });
  });
});

// 更新活动
// 修改活动信息的API
app.put('/api/activities/:id', verifyToken, (req, res) => {
  const activityId = req.params.id;
  const {
    title,
    description,
    club_id,
    start_time,
    end_time,
    location,
    max_participants,
    status,
    points,
    tags,
    contact
  } = req.body;
  
  // 修改这里，添加日期格式转换
  const formattedStartTime = start_time ? new Date(start_time).toISOString().slice(0, 19).replace('T', ' ') : null;
  const formattedEndTime = end_time ? new Date(end_time).toISOString().slice(0, 19).replace('T', ' ') : null;

  // 然后修改SQL查询，使用转换后的日期
  const updateQuery = `
    UPDATE activities
    SET title = ?, description = ?, club_id = ?, 
        start_time = ?, end_time = ?, location = ?,
        max_participants = ?, status = ?, points = ?,
        tags = ?, contact = ?
    WHERE id = ?
  `;
  
  // 使用转换后的日期格式
  db.query(
    updateQuery,
    [
      title, 
      description, 
      club_id, 
      formattedStartTime, // 使用转换后的格式 
      formattedEndTime,   // 使用转换后的格式
      location, 
      max_participants, 
      status, 
      points, 
      tags, 
      contact, 
      activityId
    ],
    (err, result) => {
      if (err) {
        console.error('更新活动失败:', err);
        return res.status(500).json({ success: false, message: err.message });
      }
      
      res.json({
        success: true,
        message: '活动更新成功',
        data: { id: activityId }
      });
    }
  );
});

// 获取社团成员列表
app.get('/api/club-members', verifyToken, (req, res) => {
  const clubId = req.query.clubId;
  
  let query = `
    SELECT cm.id, cm.user_id, cm.club_id, cm.role, cm.status,
           cm.join_date,
           u.username, 
           c.name as club_name
    FROM club_members cm
    JOIN users u ON cm.user_id = u.id
    JOIN clubs c ON cm.club_id = c.id
  `;
  
  const queryParams = [];
  
  if (clubId) {
    query += ` WHERE cm.club_id = ?`;
    queryParams.push(clubId);
  }
  
  query += ` ORDER BY cm.club_id, cm.role ASC, cm.join_date DESC`;
  
  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('获取社团成员失败:', err);
      return res.status(500).json({ success: false, message: '获取社团成员失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 在app.js中查找删除社团成员的API
app.delete('/api/club-members/:id', verifyToken, (req, res) => {
  const memberId = req.params.id;
  
  // 如果有检查是否为社长的代码，需要删除这部分限制
  // 例如:
  // 检查是否为社长
  const checkRoleQuery = `SELECT role FROM club_members WHERE id = ?`;
  db.query(checkRoleQuery, [memberId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: '检查成员角色失败' });
    }
    
    if (results.length > 0 && results[0].role === 1) {
      return res.status(403).json({ success: false, message: '不能删除社长' });
    }
 
  });
  
  // 改为直接删除，不检查角色:
  const deleteQuery = `DELETE FROM club_members WHERE id = ?`;
  db.query(deleteQuery, [memberId], (err, result) => {
    if (err) {
      console.error('删除社团成员失败:', err);
      return res.status(500).json({ success: false, message: '删除社团成员失败' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }
    
    res.status(200).json({
      success: true,
      message: '成员删除成功'
    });
  });
});


app.get('/api/user/profile', verifyToken, (req, res) => {
  const userId = req.userId;

  const query = `
    SELECT 
      u.id, 
      u.username, 
      u.role, 
      u.email, 
      u.phone, 
      u.department, 
      u.major, 
      u.grade, 
      u.class, 
      u.address, 
      u.bio, 
      u.avatar,
      (SELECT SUM(p.points) FROM points p WHERE p.user_id = u.id) AS total_points,
      (SELECT SUM(per.points) FROM points_exchange_records per JOIN products pr ON per.product_id = pr.id WHERE per.user_id = u.id) AS points_used
    FROM 
      users u 
    WHERE 
      u.id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('获取用户资料失败:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 计算剩余积分
    const user = results[0];
    user.remaining_points = user.total_points - user.points_used;

    res.json({ success: true, data: user });
  });
});


// 添加更新用户个人资料API
app.put('/api/user/profile', verifyToken, (req, res) => {
  const userId = req.userId;
  const { username, email, phone, department, major, grade, class: userClass, address, bio } = req.body;
  
  const query = `
    UPDATE users 
    SET username = ?, 
        email = ?, 
        phone = ?, 
        department = ?, 
        major = ?, 
        grade = ?, 
        class = ?, 
        address = ?, 
        bio = ? 
    WHERE id = ?
  `;
  
  db.query(
    query,
    [username, email, phone, department, major, grade, userClass, address, bio, userId],
    (err, result) => {
      if (err) {
        console.error('更新用户资料失败:', err);
        return res.status(500).json({ success: false, message: '更新失败' });
      }
      
      res.json({ success: true, message: '更新成功' });
    }
  );
});

// 添加上传用户头像API
app.post('/api/user/avatar', verifyToken, upload.single('avatar'), (req, res) => {
  const userId = req.userId;
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: '头像上传失败' });
  }
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  // 更新数据库中的头像URL
  const query = 'UPDATE users SET avatar = ? WHERE id = ?';
  
  db.query(query, [avatarUrl, userId], (err, result) => {
    if (err) {
      console.error('头像上传失败:', err);
      return res.status(500).json({ success: false, message: '头像上传失败' });
    }
    
    res.json({ 
      success: true, 
      message: '头像上传成功',
      data: { avatar: avatarUrl } 
    });
  });
});

// 修改密码的 API
app.put('/api/user/password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.userId;

  // 检查请求体是否包含必要字段
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '当前密码和新密码均为必填项'
    });
  }

  // 查询用户的旧密码哈希值
  const query = `SELECT password FROM users WHERE id = ?`;
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('查询用户密码失败:', err);
      return res.status(500).json({
        success: false,
        message: '修改密码时出错'
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到用户'
      });
    }

    const user = results[0];
    // 验证当前密码
    bcrypt.compare(currentPassword, user.password, (compareErr, isMatch) => {
      if (compareErr) {
        console.error('密码比较出错:', compareErr);
        return res.status(500).json({
          success: false,
          message: '修改密码时出错'
        });
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: '当前密码不正确'
        });
      }

      // 对新密码进行哈希处理
      bcrypt.genSalt(10, (saltErr, salt) => {
        if (saltErr) {
          console.error('生成盐值出错:', saltErr);
          return res.status(500).json({
            success: false,
            message: '修改密码时出错'
          });
        }

        bcrypt.hash(newPassword, salt, (hashErr, hash) => {
          if (hashErr) {
            console.error('哈希新密码出错:', hashErr);
            return res.status(500).json({
              success: false,
              message: '修改密码时出错'
            });
          }

          // 更新数据库中的密码
          const updateQuery = `UPDATE users SET password = ? WHERE id = ?`;
          db.query(updateQuery, [hash, userId], (updateErr) => {
            if (updateErr) {
              console.error('更新密码失败:', updateErr);
              return res.status(500).json({
                success: false,
                message: '修改密码时出错'
              });
            }

            res.status(200).json({
              success: true,
              message: '密码修改成功'
            });
          });
        });
      });
    });
  });
});

// 添加获取角色列表API
// app.get('/api/roles', verifyToken, (req, res) => {
//   const sql = `
//     SELECT id, name, description, created_at, updated_at
//     FROM roles
//     ORDER BY id
//   `;
  
//   db.query(sql, (err, results) => {
//     if (err) {
//       console.error('获取角色列表失败:', err);
//       return res.status(500).json({ success: false, message: '获取角色列表失败' });
//     }
//     res.json({ success: true, data: results });
//   });
// });

// 添加创建角色API
app.post('/api/roles', verifyToken, (req, res) => {
  // 检查用户角色是否为管理员
  if (req.userRole !== 0) {
    return res.status(403).json({ success: false, message: '只有管理员可以创建角色' });
  }
  
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: '角色名称为必填项' });
  }
  
  const sql = 'INSERT INTO roles (name, description) VALUES (?, ?)';
  
  db.query(sql, [name, description], (err, result) => {
    if (err) {
      console.error('创建角色失败:', err);
      return res.status(500).json({ success: false, message: '创建角色失败' });
    }
    
    res.status(201).json({ 
      success: true, 
      message: '角色创建成功',
      data: { id: result.insertId }
    });
  });
});

// ... existing code ...

// 更新角色信息的 API
app.put('/api/roles/:id', authenticateToken, (req, res) => {
  const roleId = req.params.id;
  const { username, role, bio } = req.body;

  // 验证请求体中的必要字段
  if (!username || role === undefined) {
    return res.status(400).json({
      success: false,
      message: "用户名和角色为必填项"
    });
  }

  // 构建更新查询语句，添加 bio 字段
  const query = `
    UPDATE users 
    SET username = ?, role = ? , updated_at =NOW(), bio = ?
    WHERE id = ?
  `;

  // 修改点：调整参数顺序，添加 bio 字段
  db.query(query, [username, role, bio, roleId], (err, results) => {
    if (err) {
      console.error('更新角色信息失败:', err);
      return res.status(500).json({
        success: false,
        message: '更新角色信息失败'
      });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到对应的角色信息'
      });
    }

    res.status(200).json({
      success: true,
      message: '角色信息更新成功'
    });
  });
});

// ... existing code ...

// 更新社团成员角色
app.put('/api/club-members/:id/role', verifyToken, (req, res) => {
  const memberId = req.params.id;
  const { role } = req.body;
  const userRole = req.userRole;
  
  // 检查用户角色是否有权限修改
  if (userRole !== 0 && userRole !== 2) {
    return res.status(403).json({ success: false, message: '没有权限修改成员角色' });
  }
  
  // 验证角色值是否有效
  if (role !== 1 && role !== 2) {
    return res.status(400).json({ success: false, message: '无效的角色值，只能设置为1(成员)或2(社长)' });
  }
  
  // 首先获取成员信息
  const getMemberQuery = "SELECT club_id FROM club_members WHERE id = ?";
  db.query(getMemberQuery, [memberId], (err, memberResults) => {
    if (err) {
      console.error('获取成员信息失败:', err);
      return res.status(500).json({ success: false, message: '更新角色失败' });
    }
    
    if (memberResults.length === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }
    
    const clubId = memberResults[0].club_id;
    
    // 如果是社长而非管理员，检查是否为同一社团
    if (userRole === 2) {
      const checkClubQuery = "SELECT id FROM clubs WHERE leader_id = ?";
      db.query(checkClubQuery, [req.userId], (err, clubResults) => {
        if (err) {
          console.error('检查社长社团失败:', err);
          return res.status(500).json({ success: false, message: '更新角色失败' });
        }
        
        if (clubResults.length === 0 || clubResults[0].id !== clubId) {
          return res.status(403).json({ success: false, message: '没有权限修改其他社团成员' });
        }
        
        // 社长权限验证通过，执行角色更新
        updateMemberRoleProcess(memberId, role, clubId, res);
      });
    } else {
      // 管理员直接有权限修改
      updateMemberRoleProcess(memberId, role, clubId, res);
    }
  });
});

// 辅助函数：处理角色更新过程
function updateMemberRoleProcess(memberId, role, clubId, res) {
  // 如果要设置为社长(role=2)，先将原社长设为普通成员
  if (role === 2) {
    // 查找当前社长
    const findLeaderQuery = "SELECT id FROM club_members WHERE club_id = ? AND role = 2 AND id != ?";
    db.query(findLeaderQuery, [clubId, memberId], (err, leaderResults) => {
      if (err) {
        console.error('查找社长失败:', err);
        return res.status(500).json({ success: false, message: '更新角色失败' });
      }
      
      // 有其他社长，先将其降级
      if (leaderResults.length > 0) {
        const currentLeaderId = leaderResults[0].id;
        const downgradeQuery = "UPDATE club_members SET role = 1 WHERE id = ?";
        
        db.query(downgradeQuery, [currentLeaderId], (err) => {
          if (err) {
            console.error('降级原社长失败:', err);
            return res.status(500).json({ success: false, message: '降级原社长失败' });
          }
          
          // 降级成功后升级新社长
          updateMemberRoleFinal(memberId, role, res);
        });
      } else {
        // 没有其他社长，直接升级
        updateMemberRoleFinal(memberId, role, res);
      }
    });
  } else {
    // 不是设置社长，直接更新角色
    updateMemberRoleFinal(memberId, role, res);
  }
}

// 辅助函数：执行最终的角色更新
function updateMemberRoleFinal(memberId, role, res) {
  const updateQuery = "UPDATE club_members SET role = ? WHERE id = ?";
  db.query(updateQuery, [role, memberId], (err, result) => {
    if (err) {
      console.error('更新角色失败:', err);
      return res.status(500).json({ success: false, message: '更新角色失败' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }
    
    // 如果是更新为社长，需要同时更新clubs表的leader_id
    if (role === 2) {
      // 先获取用户id和社团id
      const getMemberInfoQuery = "SELECT user_id, club_id FROM club_members WHERE id = ?";
      db.query(getMemberInfoQuery, [memberId], (err, memberInfo) => {
        if (err || memberInfo.length === 0) {
          console.error('获取成员详细信息失败:', err);
          // 已经更新了club_members表，所以仍然返回成功
          return res.json({ 
            success: true, 
            message: '角色更新成功，但更新社团leader_id失败'
          });
        }
        
        // 更新clubs表的leader_id
        const updateClubLeaderQuery = "UPDATE clubs SET leader_id = ? WHERE id = ?";
        db.query(updateClubLeaderQuery, 
          [memberInfo[0].user_id, memberInfo[0].club_id], 
          (err) => {
            if (err) {
              console.error('更新社团leader_id失败:', err);
              return res.json({ 
                success: true, 
                message: '角色更新成功，但更新社团leader_id失败'
              });
            }
            
            res.json({ 
              success: true, 
              message: '已成功设置为社长，并更新社团信息'
            });
          }
        );
      });
    } else {
      res.json({ 
        success: true, 
        message: '角色更新成功'
      });
    }
  });
}

// 修改添加社团成员API，确保添加社长时检查
app.post('/api/club-members', verifyToken, (req, res) => {
  const { user_id, club_id, role = 1 } = req.body;
  
  if (!user_id || !club_id) {
    return res.status(400).json({ 
      success: false, 
      message: '用户ID和社团ID为必填项' 
    });
  }
  
  // 检查用户是否已经是该社团成员
  const checkMemberQuery = `
    SELECT id FROM club_members 
    WHERE user_id = ? AND club_id = ?
  `;
  
  db.query(checkMemberQuery, [user_id, club_id], (err, memberResults) => {
    if (err) {
      console.error('检查成员状态失败:', err);
      return res.status(500).json({ success: false, message: '添加成员失败' });
    }
    
    if (memberResults.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '该用户已经是社团成员' 
      });
    }
    
    // 如果要添加为社长，先检查社团是否已有社长
    if (role === 2) {
      const checkLeaderQuery = `
        SELECT id FROM club_members 
        WHERE club_id = ? AND role = 2
      `;
      
      db.query(checkLeaderQuery, [club_id], (err, leaderResults) => {
        if (err) {
          console.error('检查社长状态失败:', err);
          return res.status(500).json({ success: false, message: '添加成员失败' });
        }
        
        if (leaderResults.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: '该社团已有社长，一个社团只能有一个社长' 
          });
        }
        
        // 没有其他社长，可以添加
        insertClubMember(user_id, club_id, role, res);
      });
    } else {
      // 添加为普通成员，直接插入
      insertClubMember(user_id, club_id, role, res);
    }
  });
});

// 辅助函数：插入社团成员
function insertClubMember(user_id, club_id, role, res) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  const insertQuery = `
    INSERT INTO club_members (user_id, club_id, role, status, join_date)
    VALUES (?, ?, ?, 1, ?)
  `;
  
  db.query(insertQuery, [user_id, club_id, role, now], (err, result) => {
    if (err) {
      console.error('添加成员失败:', err);
      return res.status(500).json({ success: false, message: '添加成员失败' });
    }
    
    res.status(201).json({ 
      success: true, 
      message: '添加成员成功',
      data: { id: result.insertId }
    });
  });
}

// 一次性清理所有社团的多社长问题
app.post('/api/fix-all-clubs-leaders', verifyToken, (req, res) => {
  // 检查用户角色是否为管理员
  if (req.userRole !== 0) {
    return res.status(403).json({ 
      success: false, 
      message: '只有管理员可以执行此操作' 
    });
  }
  
  // 创建临时表存储每个社团最早的社长ID
  const createTempTableQuery = `
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_leaders AS
    SELECT club_id, MIN(id) as keeper_id
    FROM club_members
    WHERE role = 2
    GROUP BY club_id
  `;
  
  // 更新多余的社长为普通成员
  const updateLeadersQuery = `
    UPDATE club_members cm
    JOIN temp_leaders tl ON cm.club_id = tl.club_id
    SET cm.role = 1
    WHERE cm.role = 2 AND cm.id != tl.keeper_id
  `;

  // 删除临时表
  const dropTempTableQuery = `
    DROP TEMPORARY TABLE IF EXISTS temp_leaders
  `;

  // 执行修复
  db.query(createTempTableQuery, (err) => {
    if (err) {
      console.error('创建临时表失败:', err);
      return res.status(500).json({ success: false, message: '修复社长数据失败' });
    }
    
    db.query(updateLeadersQuery, (err, updateResult) => {
      if (err) {
        console.error('更新社长数据失败:', err);
        return res.status(500).json({ success: false, message: '修复社长数据失败' });
      }
      
      db.query(dropTempTableQuery, (err) => {
        if (err) {
          console.error('删除临时表失败:', err);
          // 继续返回结果，因为主要操作已完成
        }
        
        res.json({ 
          success: true, 
          message: `已成功修复，将${updateResult.affectedRows}个额外的社长改为普通成员`,
          data: { affected_rows: updateResult.affectedRows }
        });
      });
    });
  });
});

// 添加获取学生/社长活动列表的API
app.get('/student/activities', verifyToken, (req, res) => {
  // 注意：这里替换原来的路由定义，确保正确的角色判断
  const userRole = req.userRole;
  const userId = req.userId;
  
  let query = `
    SELECT a.*, c.name as club_name, u.username as organizer_name
    FROM activities a
    LEFT JOIN clubs c ON a.club_id = c.id
    LEFT JOIN users u ON c.leader_id = u.id
    WHERE 1=1
  `;
  
  // 修正：社长角色是2，不是1
  if (userRole === 2) { // 社长角色是2，不是1
    query += ` AND c.leader_id = ${userId}`;
  }
  
  query += ` ORDER BY a.created_at DESC`;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('获取学生活动列表失败:', err);
      return res.status(500).json({ success: false, message: '获取活动列表失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 添加获取我的活动API（已报名的活动）
app.get('/student/my-activities', verifyToken, (req, res) => {
  // 与原来的/api/student/my-activities代码相同
  const userId = req.userId;
  
  const query = `
    SELECT a.*, c.name as club_name, u.username as organizer_name, 
           ap.status as signup_status, ap.created_at as signup_time
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    LEFT JOIN clubs c ON a.club_id = c.id
    LEFT JOIN users u ON c.leader_id = u.id
    WHERE ap.user_id = ?
    ORDER BY a.start_time DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('获取我的活动列表失败:', err);
      return res.status(500).json({ success: false, message: '获取活动列表失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 社长查看社员列表
app.get('/api/leader/club-members', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 先查询该用户是哪个社团的社长
  const getClubQuery = `
    SELECT id FROM clubs WHERE leader_id = ?
  `;
  
  db.query(getClubQuery, [userId], (err, clubResults) => {
    if (err) {
      console.error('查询社团信息失败:', err);
      return res.status(500).json({ success: false, message: '获取社员列表失败' });
    }
    
    if (clubResults.length === 0) {
      return res.status(403).json({ success: false, message: '您不是任何社团的社长' });
    }
    
    const clubId = clubResults[0].id;
    
    // 查询该社团的所有成员
    const getMembersQuery = `
      SELECT cm.*, u.username, u.email, u.phone, u.department
      FROM club_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ?
    `;
    
    db.query(getMembersQuery, [clubId], (err, memberResults) => {
      if (err) {
        console.error('查询社员列表失败:', err);
        return res.status(500).json({ success: false, message: '获取社员列表失败' });
      }
      
      res.status(200).json({
        success: true,
        data: memberResults
      });
    });
  });
});

// 添加新的路由以匹配前端请求路径
app.get('/student/manage-members', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 先查询该用户是哪个社团的社长
  const getClubQuery = `
    SELECT c.id, c.name 
    FROM clubs c
    WHERE c.leader_id = ?
  `;
  
  db.query(getClubQuery, [userId], (err, clubResults) => {
    if (err) {
      console.error('查询社团信息失败:', err);
      return res.status(500).json({ success: false, message: '获取社员列表失败' });
    }
    
    if (clubResults.length === 0) {
      return res.status(403).json({ success: false, message: '您不是任何社团的社长' });
    }
    
    const clubId = clubResults[0].id;
    const clubName = clubResults[0].name;
    
    // 查询该社团的所有成员
    const getMembersQuery = `
      SELECT cm.id, cm.user_id, cm.role, cm.status, cm.join_date,
             u.username, u.email, u.phone, u.department, 
             u.major, u.grade, u.class
      FROM club_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ?
      ORDER BY cm.role DESC, cm.join_date
    `;
    
    db.query(getMembersQuery, [clubId], (err, memberResults) => {
      if (err) {
        console.error('查询社员列表失败:', err);
        return res.status(500).json({ success: false, message: '获取社员列表失败' });
      }
      
      res.status(200).json({
        success: true,
        data: {
          club: {
            id: clubId,
            name: clubName
          },
          members: memberResults
        }
      });
    });
  });
});

// 添加社长更新成员角色的接口
app.put('/student/manage-members/:memberId', verifyToken, (req, res) => {
  const userId = req.userId;
  const memberId = req.params.memberId;
  const { role } = req.body;
  
  // 验证角色值
  if (![1, 2, 3].includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: '无效的角色值' 
    });
  }
  
  // 检查是否为社长
  const checkLeaderQuery = `
    SELECT c.id FROM clubs c WHERE c.leader_id = ?
  `;
  
  db.query(checkLeaderQuery, [userId], (err, leaderResults) => {
    if (err) {
      console.error('检查社长权限失败:', err);
      return res.status(500).json({ success: false, message: '更新失败' });
    }
    
    if (leaderResults.length === 0) {
      return res.status(403).json({ success: false, message: '您不是社团的社长' });
    }
    
    const clubId = leaderResults[0].id;
    
    // 验证此成员是否属于该社团
    const checkMemberQuery = `
      SELECT club_id FROM club_members WHERE id = ?
    `;
    
    db.query(checkMemberQuery, [memberId], (err, memberResults) => {
      if (err) {
        console.error('检查成员信息失败:', err);
        return res.status(500).json({ success: false, message: '更新失败' });
      }
      
      if (memberResults.length === 0) {
        return res.status(404).json({ success: false, message: '成员不存在' });
      }
      
      if (memberResults[0].club_id !== clubId) {
        return res.status(403).json({ success: false, message: '无权修改其他社团的成员' });
      }
      
      // 更新成员角色
      // 如果要设置为社长，先检查是否已有其他社长
      if (role === 2) {
        // 查找当前社长(排除正在修改的成员)
        const findLeaderQuery = "SELECT id FROM club_members WHERE club_id = ? AND role = 2 AND id != ?";
        db.query(findLeaderQuery, [clubId, memberId], (err, leaderResults) => {
          if (err) {
            console.error('查找社长失败:', err);
            return res.status(500).json({ success: false, message: '更新失败' });
          }
          
          // 如果找到其他社长，先将其降级
          if (leaderResults.length > 0) {
            const currentLeaderId = leaderResults[0].id;
            const downgradeQuery = "UPDATE club_members SET role = 1 WHERE id = ?";
            
            db.query(downgradeQuery, [currentLeaderId], (err) => {
              if (err) {
                console.error('降级原社长失败:', err);
                return res.status(500).json({ success: false, message: '更新失败' });
              }
              
              console.log(`已将社团${clubId}的原社长(ID:${currentLeaderId})降级为普通成员`);
              // 然后设置新社长
              updateMemberRole(memberId, role, clubId, res);
            });
          } else {
            // 没有其他社长，直接更新
            updateMemberRole(memberId, role, clubId, res);
          }
        });
      } else {
        // 不是设置为社长，直接更新
        const updateQuery = `UPDATE club_members SET role = ? WHERE id = ?`;
        db.query(updateQuery, [role, memberId], (err, updateResult) => {
          if (err) {
            console.error('更新成员角色失败:', err);
            return res.status(500).json({ success: false, message: '更新失败' });
          }
          
          res.json({ success: true, message: '角色更新成功' });
        });
      }
    });
  });
});

// 添加社长删除成员的接口
app.delete('/student/manage-members/:memberId', verifyToken, (req, res) => {
  const userId = req.userId;
  const memberId = req.params.memberId;
  
  // 检查是否为社长
  const checkLeaderQuery = `
    SELECT c.id FROM clubs c WHERE c.leader_id = ?
  `;
  
  db.query(checkLeaderQuery, [userId], (err, leaderResults) => {
    if (err) {
      console.error('检查社长权限失败:', err);
      return res.status(500).json({ success: false, message: '删除失败' });
    }
    
    if (leaderResults.length === 0) {
      return res.status(403).json({ success: false, message: '您不是社团的社长' });
    }
    
    const clubId = leaderResults[0].id;
    
    // 验证此成员是否属于该社团
    const checkMemberQuery = `
      SELECT club_id, user_id FROM club_members WHERE id = ?
    `;
    
    db.query(checkMemberQuery, [memberId], (err, memberResults) => {
      if (err) {
        console.error('检查成员信息失败:', err);
        return res.status(500).json({ success: false, message: '删除失败' });
      }
      
      if (memberResults.length === 0) {
        return res.status(404).json({ success: false, message: '成员不存在' });
      }
      
      if (memberResults[0].club_id !== clubId) {
        return res.status(403).json({ success: false, message: '无权删除其他社团的成员' });
      }
      
      // 不能删除自己（社长）
      if (memberResults[0].user_id === userId) {
        return res.status(400).json({ success: false, message: '社长不能删除自己' });
      }
      
      // 删除成员
      const deleteQuery = `DELETE FROM club_members WHERE id = ?`;
      
      db.query(deleteQuery, [memberId], (err, deleteResult) => {
        if (err) {
          console.error('删除成员失败:', err);
          return res.status(500).json({ success: false, message: '删除失败' });
        }
        
        res.json({ 
          success: true, 
          message: '成员删除成功'
        });
      });
    });
  });
});

// 把该路由移到app.listen前面
app.get('/student/club-info', verifyToken, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;
  
  // 检查是否为社长(角色值为2)
  if (userRole !== 2) {
    return res.status(403).json({ 
      success: false, 
      message: '只有社长可以管理成员' 
    });
  }
  
  // 查询该用户的社团信息
  const clubQuery = `
    SELECT c.id, c.name, c.description
    FROM clubs c
    WHERE c.leader_id = ?`;
  
  db.query(clubQuery, [userId], (err, clubResults) => {
    if (err) {
      console.error('查询社团信息失败:', err);
      return res.status(500).json({ success: false, message: '获取社团信息失败' });
    }
    
    if (clubResults.length === 0) {
      return res.status(404).json({ success: false, message: '您不是任何社团的社长' });
    }
    
    res.status(200).json({
      success: true,
      data: clubResults[0]
    });
  });
});


// 添加一个新路由，处理社长获取社团成员信息
app.get('/student/manage-members', verifyToken, (req, res) => {
  const userId = req.userId;
  const userRole = req.userRole;
  
  // 检查是否为社长(角色值为2)
  if (userRole !== 2) {
    return res.status(403).json({ 
      success: false, 
      message: '只有社长可以管理成员' 
    });
  }
  
  // 查询该用户是哪个社团的社长
  const getClubQuery = `
    SELECT c.id, c.name 
    FROM clubs c
    WHERE c.leader_id = ?
  `;
  
  db.query(getClubQuery, [userId], (err, clubResults) => {
    if (err) {
      console.error('查询社团信息失败:', err);
      return res.status(500).json({ success: false, message: '获取社员列表失败' });
    }
    
    if (clubResults.length === 0) {
      return res.status(403).json({ success: false, message: '您不是任何社团的社长' });
    }
    
    const clubId = clubResults[0].id;
    const clubName = clubResults[0].name;
    
    // 查询该社团的所有成员
    const getMembersQuery = `
      SELECT cm.id, cm.user_id, cm.role, cm.status, cm.join_date,
             u.username, u.email, u.phone, u.department, 
             u.major, u.grade, u.class
      FROM club_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.club_id = ?
      ORDER BY cm.role DESC, cm.join_date
    `;
    
    db.query(getMembersQuery, [clubId], (err, memberResults) => {
      if (err) {
        console.error('查询社员列表失败:', err);
        return res.status(500).json({ success: false, message: '获取社员列表失败' });
      }
      
      res.status(200).json({
        success: true,
        data: {
          club: {
            id: clubId,
            name: clubName
          },
          members: memberResults
        }
      });
    });
  });
});

// 更新社团成员信息
app.put('/api/club-members/:id', verifyToken, (req, res) => {
  const memberId = req.params.id;
  const { user_id, club_id, role, join_date, status, username } = req.body;
  
  console.log("请求体:", req.body); // 调试日志
  
  // 获取当前成员信息
  const getMemberQuery = "SELECT * FROM club_members WHERE id = ?";
  db.query(getMemberQuery, [memberId], (err, memberResults) => {
    if (err) {
      console.error('获取成员信息失败:', err);
      return res.status(500).json({ success: false, message: '更新成员信息失败' });
    }
    
    if (memberResults.length === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }
    
    const currentMember = memberResults[0];
    const roleToSet = role !== undefined ? role : currentMember.role;
    
    // 处理username参数 - 如果提供了username而不是user_id
    if (username && !user_id) {
      // 根据username查找user_id
      const getUserQuery = "SELECT id FROM users WHERE username = ?";
      db.query(getUserQuery, [username], (err, userResults) => {
        if (err) {
          console.error('查找用户ID失败:', err);
          return res.status(500).json({ success: false, message: '更新成员信息失败' });
        }
        
        if (userResults.length === 0) {
          return res.status(404).json({ success: false, message: '找不到用户: ' + username });
        }
        
        const userId = userResults[0].id;
        const clubIdToUse = club_id || currentMember.club_id;
        
        // 使用找到的user_id继续处理
        checkRoleAndUpdate(memberId, userId, clubIdToUse, roleToSet, join_date, status, res, currentMember);
      });
    } else {
      // 直接使用提供的user_id或保持原值
      const userIdToUse = user_id || currentMember.user_id;
      const clubIdToUse = club_id || currentMember.club_id;
      checkRoleAndUpdate(memberId, userIdToUse, clubIdToUse, roleToSet, join_date, status, res, currentMember);
    }
  });
});

// 辅助函数：检查角色并更新
function checkRoleAndUpdate(memberId, userId, clubId, role, join_date, status, res, currentMember) {
  // 如果要修改为社长角色，需要先检查社团是否已有社长
  if (role === 2 && currentMember.role !== 2) {
    const checkLeaderQuery = `
      SELECT id FROM club_members 
      WHERE club_id = ? AND role = 2 AND id != ?
    `;
    
    db.query(checkLeaderQuery, [clubId, memberId], (err, leaderResults) => {
      if (err) {
        console.error('检查社长状态失败:', err);
        return res.status(500).json({ success: false, message: '更新成员信息失败' });
      }
      
      if (leaderResults.length > 0) {
        // 找到原社长，将其降级为普通成员
        const currentLeaderId = leaderResults[0].id;
        const downgradeQuery = "UPDATE club_members SET role = 1 WHERE id = ?";
        
        db.query(downgradeQuery, [currentLeaderId], (err) => {
          if (err) {
            console.error('降级原社长失败:', err);
            return res.status(500).json({ success: false, message: '降级原社长失败' });
          }
          
          console.log(`已将社团${clubId}的原社长(ID:${currentLeaderId})降级为普通成员`);
          // 降级成功后更新新社长
          updateMember(memberId, userId, clubId, role, join_date, status, res);
        });
      } else {
        // 没有其他社长，可以直接更新
        updateMember(memberId, userId, clubId, role, join_date, status, res);
      }
    });
  } else {
    // 不涉及社长角色的更新，直接更新
    updateMember(memberId, userId, clubId, role, join_date, status, res);
  }
}

// 辅助函数：执行成员信息更新
function updateMember(memberId, user_id, club_id, role, join_date, status, res) {
  let updateFields = [];
  let updateValues = [];
  
  if (user_id) {
    updateFields.push('user_id = ?');
    updateValues.push(user_id);
  }
  
  if (club_id) {
    updateFields.push('club_id = ?');
    updateValues.push(club_id);
  }
  
  if (role) {
    updateFields.push('role = ?');
    updateValues.push(role);
  }
  
  if (join_date) {
    updateFields.push('join_date = ?');
    updateValues.push(join_date);
  }
  
  if (status !== undefined) {
    updateFields.push('status = ?');
    updateValues.push(status);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ success: false, message: '没有提供要更新的字段' });
  }
  
  const updateQuery = `UPDATE club_members SET ${updateFields.join(', ')} WHERE id = ?`;
  updateValues.push(memberId);
  
  db.query(updateQuery, updateValues, (err, result) => {
    if (err) {
      console.error('更新成员信息失败:', err);
      return res.status(500).json({ success: false, message: '更新成员信息失败' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '成员不存在' });
    }
    
    // 如果更新为社长角色，同时更新clubs表的leader_id
    if (role === 2) {
      const updateClubLeaderQuery = "UPDATE clubs SET leader_id = ? WHERE id = ?";
      db.query(updateClubLeaderQuery, [user_id, club_id], (err) => {
        if (err) {
          console.error('更新社团leader_id失败:', err);
          return res.json({ 
            success: true, 
            message: '成员信息更新成功，但更新社团leader_id失败'
          });
        }
        
        res.json({ 
          success: true, 
          message: '成员信息更新成功，并已更新社团社长信息'
        });
      });
    } else {
      res.json({ 
        success: true, 
        message: '成员信息更新成功'
      });
    }
  });
}

// 添加社长更新成员角色的辅助函数
function updateMemberRole(memberId, role, clubId, res) {
  // 更新成员角色
  const updateQuery = `UPDATE club_members SET role = ? WHERE id = ?`;
  db.query(updateQuery, [role, memberId], (err, updateResult) => {
    if (err) {
      console.error('更新成员角色失败:', err);
      return res.status(500).json({ success: false, message: '更新失败' });
    }
    
    // 如果是设置为社长，同时更新clubs表的leader_id
    if (role === 2) {
      // 先获取用户id
      const getMemberQuery = "SELECT user_id FROM club_members WHERE id = ?";
      db.query(getMemberQuery, [memberId], (err, memberInfo) => {
        if (err || memberInfo.length === 0) {
          console.error('获取成员信息失败:', err);
          return res.json({ 
            success: true, 
            message: '角色更新成功，但更新社团社长信息失败'
          });
        }
        
        const userId = memberInfo[0].user_id;
        
        // 更新clubs表的leader_id
        const updateClubQuery = "UPDATE clubs SET leader_id = ? WHERE id = ?";
        db.query(updateClubQuery, [userId, clubId], (err) => {
          if (err) {
            console.error('更新社团社长信息失败:', err);
            return res.json({ 
              success: true, 
              message: '角色更新成功，但更新社团社长信息失败'
            });
          }
          
          res.json({ 
            success: true, 
            message: '已成功设置为社长，并更新社团信息'
          });
        });
      });
    } else {
      res.json({ 
        success: true, 
        message: '角色更新成功'
      });
    }
  });
}


// // 获取当前登录用户的个人信息
// app.get('/api/user/me', verifyToken, (req, res) => {
//   const userId = req.userId;
//   const query = `
//     SELECT u.id, u.username, u.role, u.email, u.phone, u.department, u.major, u.grade, u.class, u.address, u.bio, u.avatar,
//     (SELECT SUM(p.points) FROM points p WHERE p.user_id = u.id) AS total_points,
//     (SELECT SUM(per.points) FROM points_exchange_records per JOIN products pr ON per.product_id = pr.id WHERE per.user_id = u.id) AS points_used
//     FROM users u
//     WHERE u.id = ?
//   `;

//   db.query(query, [userId], (err, results) => {
//     if (err) {
//       console.error('获取用户个人信息失败:', err);
//       return res.status(500).json({ success: false, message: '获取用户个人信息失败' });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ success: false, message: '未找到用户信息' });
//     }

//     // 计算剩余积分
//     const user = results[0];
//     user.remaining_points = user.total_points - user.points_used;

//     res.status(200).json({
//       success: true,
//       data: user
//     });
//   });
// });

// // 更新当前登录用户的个人信息
// app.put('/api/user/me', verifyToken, (req, res) => {
//   const userId = req.userId;
//   const { email, phone, department, major, grade, class: userClass, address, bio, avatar } = req.body;
//   const query = `
//     UPDATE users
//     SET email = ?, phone = ?, department = ?, major = ?, grade = ?, class = ?, address = ?, bio = ?, avatar = ?
//     WHERE id = ?
//   `;

//   db.query(query, [email, phone, department, major, grade, userClass, address, bio, avatar, userId], (err, result) => {
//     if (err) {
//       console.error('更新用户个人信息失败:', err);
//       return res.status(500).json({ success: false, message: '更新用户个人信息失败' });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ success: false, message: '未找到用户信息' });
//     }

//     res.status(200).json({
//       success: true,
//       message: '用户个人信息更新成功'
//     });
//   });
// });

// 创建预约
app.post('/api/reservations', verifyToken, (req, res) => {
  const user_id = req.userId;
  const activity_id = req.body;

  // 检查是否已存在预约记录
  const checkQuery = `
    SELECT * FROM reservations
    WHERE user_id = ? AND activity_id = ?
  `;

  db.query(checkQuery, [user_id, activity_id], (err, result) => {
    if (err) {
      console.error('检查预约记录失败:', err);
      return res.status(500).json({ success: false, message: '检查预约记录失败' });
    }

    if (result.length > 0) {
      // 如果已存在预约记录，返回错误
      return res.status(400).json({ success: false, message: '您已经预约了该活动' });
    }

    // 插入新的预约记录
    const insertQuery = `
      INSERT INTO reservations (user_id, activity_id, is_reserved)
      VALUES (?, ?, 1)
    `;

    db.query(insertQuery, [user_id, activity_id], (err, result) => {
      if (err) {
        console.error('创建预约失败:', err);
        return res.status(500).json({ success: false, message: '创建预约失败' });
      }

      res.status(200).json({
        success: true,
        message: '预约成功',
        data: { reservation_id: result.insertId }
      });
    });
  });
});

// ... existing code ...

// 获取用户预约的活动
app.get('/api/reservations/signups', verifyToken, (req, res) => {
  // 修改查询语句，从 reservations 表查询预约信息
  const query = `
    SELECT id, user_id, activity_id, is_reserved, created_at, updated_at
    FROM reservations
    WHERE user_id = ? AND is_reserved = 1
  `;
  
  db.query(query, [req.userId], (err, results) => {
    if (err) {
      console.error('获取预约记录失败:', err);
      return res.status(500).json({ success: false, message: '获取预约记录失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// ... existing code ...

app.post('/api/reservations/:activityId/signup', verifyToken, async (req, res) => {
  // 从路径参数中获取 activityId
  const activityId = req.params.activityId; 
  const userId = req.userId;

  // 检查是否已经预约过该活动
  const checkQuery = `
    SELECT * 
    FROM reservations 
    WHERE user_id = ? AND activity_id = ? AND is_reserved = 1
  `;

  db.query(checkQuery, [userId, activityId], (err, checkResults) => {
    if (err) {
      console.error('检查预约记录失败:', err);
      return res.status(500).json({ success: false, message: '检查预约记录失败' });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({ success: false, message: '您已经预约过该活动' });
    }

    // 插入新的预约记录
    const insertQuery = `
      INSERT INTO reservations (user_id, activity_id, is_reserved)
      VALUES (?, ?, 1)
    `;

    db.query(insertQuery, [userId, activityId], (err, insertResults) => {
      if (err) {
        console.error('创建预约失败:', err);
        return res.status(500).json({ success: false, message: '创建预约失败' });
      }

      res.status(201).json({
        success: true,
        message: '预约成功',
        data: { id: insertResults.insertId }
      });
    });
  });
});

// ... existing code ...

// 修改获取所有预约记录的 API
// 修改获取所有预约记录的 API
app.get('/api/reservations/all', verifyToken, (req, res) => {

  // 创建当前时间对象
  let currentTime = new Date();
  // 给当前时间加上24小时（1小时 = 60分钟，1分钟 = 60秒，1秒 = 1000毫秒）
  currentTime.setTime(currentTime.getTime() + 32 * 60 * 60 * 1000);
  const formattedTime = currentTime.toISOString().slice(0, 19).replace('T', ' ');
 const query = `
 SELECT r.id, r.user_id, r.activity_id, r.is_reserved, r.created_at, r.updated_at,r.is_read,
a.title, a.description, a.start_time, a.end_time, a.location, a.max_participants, a.status
FROM reservations r
 JOIN activities a ON r.activity_id = a.id
 WHERE r.user_id = ? AND a.registration_time <= ?
`;

 db.query(query, [req.userId,formattedTime], (err, results) => {
 if (err) {
 console.error('获取预约列表失败:', err);
 return res.status(500).json({ success: false, message: '获取预约列表失败' });
 }

 res.status(200).json({
 success: true,
 data: results
 });
});
});
// ... existing code ...

// 添加更新 is_read 字段的 API
app.put('/api/reservations/:id/mark-read', verifyToken, (req, res) => {
  const { id } = req.params;
  const query = `
    UPDATE reservations 
    SET is_read = 1 
    WHERE id = ?
  `;
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('更新 is_read 字段失败:', err);
      return res.status(500).json({ success: false, message: '更新 is_read 字段失败' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '未找到对应的预约记录' });
    }
    
    res.status(200).json({
      success: true,
      message: '已标记为已读'
    });
  });
});

// ... existing code ...

app.get('/api/reservations/unread-count', verifyToken, (req, res) => {
  // 创建当前时间对象
  let currentTime = new Date();
  // 给当前时间加上24小时（1小时 = 60分钟，1分钟 = 60秒，1秒 = 1000毫秒）
  currentTime.setTime(currentTime.getTime() + 24 * 60 * 60 * 1000);
  // 格式化时间
  const formattedTime = currentTime.toISOString().slice(0, 19).replace('T', ' ');

  const reservationsQuery = `
    SELECT COUNT(*) as unread_count
    FROM reservations r
    JOIN activities a ON r.activity_id = a.id
    WHERE r.user_id = ? 
      AND r.is_reserved = 1
      AND a.registration_time < ?
      AND r.is_read = 0
  `;

  // 先查询 clubs 表中的 leader_id 对应的 id 字段
  const getClubIdsQuery = `
    SELECT IFNULL(id, 0) as club_id
    FROM clubs
    WHERE leader_id = ?
  `;

  // 执行 reservations 表的查询
  db.query(reservationsQuery, [req.userId, formattedTime], (err, reservationsResults) => {
    if (err) {
      console.error('获取 reservations 表未读记录数量失败:', err);
      return res.status(500).json({ success: false, message: '获取未读预约记录数量失败' });
    }

    const reservationsCount = reservationsResults.length > 0 ? reservationsResults[0].unread_count : 0;

    // 执行查询 clubs 表的操作
    db.query(getClubIdsQuery, [req.userId], (err, clubResults) => {
      if (err) {
        console.error('查询 clubs 表失败:', err);
        return res.status(500).json({ success: false, message: '获取未读拒绝记录数量失败' });
      }

      const clubIds = clubResults.map(result => result.club_id);
      let rejectionQuery;
      if (clubIds.length === 0 || (clubIds.length === 1 && clubIds[0] === 0)) {
        // 如果没有匹配的 club_id，直接返回 0
        rejectionQuery = `
          SELECT 0 as unread_count
        `;
      } else {
        const placeholders = clubIds.map(() => '?').join(',');
        rejectionQuery = `
          SELECT COUNT(*) as unread_count
          FROM rejection
          WHERE activitie_id IN (${placeholders})
            AND is_read = 0
        `;
      }

      // 执行 rejection 表的查询
      db.query(rejectionQuery, clubIds, (err, rejectionResults) => {
        if (err) {
          console.error('获取 rejection 表未读记录数量失败:', err);
          return res.status(500).json({ success: false, message: '获取未读拒绝记录数量失败' });
        }

        const rejectionCount = rejectionResults.length > 0 ? rejectionResults[0].unread_count : 0;

        // 计算总未读数量
        const totalUnreadCount = reservationsCount + rejectionCount;

        // 添加打印语句
        console.log(`用户 ${req.userId} 的未读预约记录数量为: ${reservationsCount}`);
        console.log(`用户 ${req.userId} 的未读拒绝记录数量为: ${rejectionCount}`);
        console.log(`用户 ${req.userId} 的总未读记录数量为: ${totalUnreadCount}`);

        res.status(200).json({
          success: true,
          data: { unread_count: totalUnreadCount }
        });
      });
    });
  });
});
// ... existing code ...

// 获取所有奖品信息
app.get('/api/products', (req, res) => {
  const query = `
    SELECT * 
    FROM products
    ORDER BY created_at DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('获取奖品列表失败:', err);
      return res.status(500).json({ success: false, message: '获取奖品列表失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 根据 id 获取单个奖品信息
app.get('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const query = `
    SELECT * 
    FROM products
    WHERE id = ?
  `;
  
  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error('获取单个奖品信息失败:', err);
      return res.status(500).json({ success: false, message: '获取单个奖品信息失败' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该奖品' });
    }
    
    res.status(200).json({
      success: true,
      data: results[0]
    });
  });
});

// ... existing code ...

// 获取当前月份和上月份的积分总和
app.get('/api/user/monthly-points', verifyToken, (req, res) => {
  const userId = req.userId;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // 构建当前月份和上月份的起始日期和结束日期
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01 00:00:00`;
  const currentMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 19).replace('T', ' ');
  const lastMonthStart = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01 00:00:00`;
  const lastMonthEnd = new Date(lastMonthYear, lastMonth, 0).toISOString().slice(0, 19).replace('T', ' ');

  // 查询当前月份的积分总和
  const currentMonthQuery = `
    SELECT SUM(points) as total_points
    FROM points
    WHERE user_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `;

  // 查询上月份的积分总和
  const lastMonthQuery = `
    SELECT SUM(points) as total_points
    FROM points
    WHERE user_id = ?
      AND created_at >= ?
      AND created_at <= ?
  `;

  // 执行当前月份的查询
  db.query(currentMonthQuery, [userId, currentMonthStart, currentMonthEnd], (err, currentResults) => {
    if (err) {
      console.error('获取当前月份积分总和失败:', err);
      return res.status(500).json({ success: false, message: '获取当前月份积分总和失败' });
    }

    const currentTotal = currentResults[0].total_points || 0;

    // 执行上月份的查询
    db.query(lastMonthQuery, [userId, lastMonthStart, lastMonthEnd], (err, lastResults) => {
      if (err) {
        console.error('获取上月份积分总和失败:', err);
        return res.status(500).json({ success: false, message: '获取上月份积分总和失败' });
      }

      const lastTotal = lastResults[0].total_points || 0;

      res.status(200).json({
        success: true,
        data: {
          thisMonth: currentTotal,
          lastMonth: lastTotal
        }
      });
      console.log(`用户 ${userId} 的当前月份积分总和为: ${currentTotal}`);
      console.log(`用户 ${userId} 的上月份积分总和为: ${lastTotal}`);
    });
  });
});

// ... existing code ...


// 积分兑换 API
app.post('/api/points/exchange', verifyToken, (req, res) => {
  const userId = req.userId; // 从 JWT 验证中间件中获取当前登录用户的 ID
  const { product_id, points, description } = req.body;

  // 验证必填字段
  if (!product_id || !points) {
    return res.status(400).json({
      success: false,
      message: "产品 ID 和积分是必填项"
    });
  }

  // 检查奖品库存
  const checkStockQuery = `
    SELECT remaining_quantity 
    FROM products 
    WHERE id = ?
  `;

  db.query(checkStockQuery, [product_id], (err, stockResults) => {
    if (err) {
      console.error('检查奖品库存失败:', err);
      return res.status(500).json({ success: false, message: '积分兑换失败' });
    }

    if (stockResults.length === 0) {
      return res.status(404).json({ success: false, message: '未找到该奖品' });
    }

    const remainingQuantity = stockResults[0].remaining_quantity;
    if (remainingQuantity <= 0) {
      return res.status(400).json({ success: false, message: '该奖品已无库存，无法兑换' });
    }

    // 插入积分兑换记录
    const insertQuery = `
      INSERT INTO points_exchange_records (user_id, product_id, points, description)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertQuery, [userId, product_id, points, description], (err, insertResult) => {
      if (err) {
        console.error('积分兑换记录插入失败:', err);
        return res.status(500).json({ success: false, message: '积分兑换失败' });
      }

      // 库存减 1
      const updateStockQuery = `
        UPDATE products 
        SET remaining_quantity = remaining_quantity - 1 
        WHERE id = ?
      `;

      db.query(updateStockQuery, [product_id], (err, updateResult) => {
        if (err) {
          console.error('更新奖品库存失败:', err);
          return res.status(500).json({ success: false, message: '积分兑换失败，库存更新出错' });
        }

        res.status(201).json({
          success: true,
          message: '积分兑换成功',
          data: { id: insertResult.insertId }
        });
      });
    });
  });
});

// ... existing code ...

// 统一获取积分和使用积分的数据
app.get('/api/user/points-history', verifyToken, (req, res) => {
  const userId = req.userId;

  // 查询积分获取记录
  const pointsEarnedQuery = `
    SELECT a.title as activity, p.created_at as date, p.points 
    FROM points p
    JOIN activities a ON p.activity_id = a.id
    WHERE p.user_id = ?
  `;

  // 查询积分使用记录
  const pointsUsedQuery = `
    SELECT p.product_name as activity, per.created_at as date, -per.points as points
    FROM points_exchange_records per
    JOIN products p ON per.product_id = p.id
    WHERE per.user_id = ?
  `;

  // 执行积分获取记录查询
  db.query(pointsEarnedQuery, [userId], (err, earnedResults) => {
    if (err) {
      console.error('获取积分获取记录失败:', err);
      return res.status(500).json({ success: false, message: '获取积分历史失败' });
    }

    // 执行积分使用记录查询
    db.query(pointsUsedQuery, [userId], (err, usedResults) => {
      if (err) {
        console.error('获取积分使用记录失败:', err);
        return res.status(500).json({ success: false, message: '获取积分历史失败' });
      }

      // 合并积分获取和使用记录
      const combinedResults = [...earnedResults, ...usedResults];

      // 按时间排序
      combinedResults.sort((a, b) => new Date(b.date) - new Date(a.date));

      res.status(200).json({
        success: true,
        data: combinedResults.map(item => ({
          activity: item.activity,
          date: item.date,
          points: item.points
        }))
      });
    });
  });
});



// ... existing code ...

// 启动服务器(放置最后）
app.listen(8080, () => {
  console.log('后端服务器运行在 http://localhost:8080');
});

// 获取用户积分信息
app.get('/api/user/points', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 获取用户总积分
  const totalPointsQuery = `
    SELECT IFNULL(SUM(points), 0) as total
    FROM points
    WHERE user_id = ?
  `;
  
  // 获取用户已使用积分
  const usedPointsQuery = `
    SELECT IFNULL(SUM(points), 0) as used
    FROM points_exchange_records
    WHERE user_id = ?
  `;
  
  db.query(totalPointsQuery, [userId], (err, totalResult) => {
    if (err) {
      console.error('获取用户总积分失败:', err);
      return res.status(500).json({ success: false, message: '获取积分数据失败' });
    }
    
    db.query(usedPointsQuery, [userId], (err, usedResult) => {
      if (err) {
        console.error('获取用户已使用积分失败:', err);
        return res.status(500).json({ success: false, message: '获取积分数据失败' });
      }
      
      const total = totalResult[0].total || 0;
      const used = usedResult[0].used || 0;
      const remaining = total - used;
      
      res.status(200).json({
        success: true,
        total: total,
        used: used,
        remaining: remaining
      });
    });
  });
});

// 获取用户积分历史数据
app.get('/api/user/points/history', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 获取用户积分获取记录
  const earnQuery = `
    SELECT p.id, p.points, p.reason, a.title as activity_name, p.created_at
    FROM points p
    LEFT JOIN activities a ON p.activity_id = a.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `;
  
  // 获取用户积分使用记录
  const spendQuery = `
    SELECT id, points, product_id, description, created_at
    FROM points_exchange_records
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  
  db.query(earnQuery, [userId], (err, earnRecords) => {
    if (err) {
      console.error('获取积分获取记录失败:', err);
      return res.status(500).json({ success: false, message: '获取积分历史失败' });
    }
    
    db.query(spendQuery, [userId], (err, spendRecords) => {
      if (err) {
        console.error('获取积分使用记录失败:', err);
        return res.status(500).json({ success: false, message: '获取积分历史失败' });
      }
      
      res.status(200).json({
        success: true,
        earn: earnRecords,
        spend: spendRecords
      });
    });
  });
});

// 获取用户活动参与统计
app.get('/api/user/activity-stats', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 获取用户参与的活动类型分布
  const activityTypesQuery = `
    SELECT a.category, COUNT(*) as count
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    WHERE ap.user_id = ?
    GROUP BY a.category
  `;
  
  // 获取用户参与的活动状态分布
  const activityStatusQuery = `
    SELECT a.status, COUNT(*) as count
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    WHERE ap.user_id = ?
    GROUP BY a.status
  `;
  
  // 获取用户过去6个月的活动参与趋势
  const activityTrendQuery = `
    SELECT 
      DATE_FORMAT(a.start_time, '%Y-%m') as month,
      COUNT(*) as count
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.id
    WHERE ap.user_id = ? AND a.start_time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(a.start_time, '%Y-%m')
    ORDER BY month
  `;
  
  db.query(activityTypesQuery, [userId], (err, typesResult) => {
    if (err) {
      console.error('获取活动类型分布失败:', err);
      return res.status(500).json({ success: false, message: '获取活动统计失败' });
    }
    
    db.query(activityStatusQuery, [userId], (err, statusResult) => {
      if (err) {
        console.error('获取活动状态分布失败:', err);
        return res.status(500).json({ success: false, message: '获取活动统计失败' });
      }
      
      db.query(activityTrendQuery, [userId], (err, trendResult) => {
        if (err) {
          console.error('获取活动参与趋势失败:', err);
          return res.status(500).json({ success: false, message: '获取活动统计失败' });
        }
        
        // 处理月份数据，确保包含过去6个月
        const months = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today);
          d.setMonth(d.getMonth() - i);
          const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          months.push(monthStr);
        }
        
        // 构建趋势数据
        const trendData = months.map(month => {
          const found = trendResult.find(r => r.month === month);
          return {
            month,
            count: found ? found.count : 0
          };
        });
        
        res.status(200).json({
          success: true,
          data: {
            types: typesResult,
            status: statusResult,
            trend: trendData
          }
        });
      });
    });
  });
});

// 获取用户社团活动统计
app.get('/api/user/clubs', verifyToken, (req, res) => {
  const userId = req.userId;
  
  // 获取用户加入的社团列表
  const query = `
    SELECT c.id, c.name, c.description, c.logo, cm.role as member_role, cm.join_date
    FROM club_members cm
    JOIN clubs c ON cm.club_id = c.id
    WHERE cm.user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('获取用户社团列表失败:', err);
      return res.status(500).json({ success: false, message: '获取社团数据失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});


/////评论

// 获取评论板块

// 获取所有板块
app.get('/api/categories', (req, res) => {
  const query = `
    SELECT * FROM categories
    ORDER BY category_id ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('获取板块失败:', err);
      return res.status(500).json({ success: false, message: '获取板块失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

//获取特定板块的所有帖子

app.get('/api/categories/:categoryId/posts', verifyToken, (req, res) => {
  console.log('Received request to fetch posts for category:', req.params.categoryId);
  const { categoryId } = req.params;
  const user_id = req.user.id; // 通过验证获取到的用户ID

  const query = `
    SELECT p.*, u.username AS user_name,
           CASE 
               WHEN l.id IS NOT NULL THEN l.islike 
               ELSE 0 
           END AS is_liked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN likes l ON p.post_id = l.post_id AND l.user_id = ?
    WHERE p.category_id = ? AND p.deleted_at IS NULL
    ORDER BY p.created_at DESC
  `;

  db.query(query, [user_id, categoryId], (err, results) => {
    if (err) {
      console.error('获取帖子失败:', err);
      return res.status(500).json({ success: false, message: '获取帖子失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 获取特定帖子的所有评论

app.get('/api/posts/:postId/comments', verifyToken, (req, res) => {
  const { postId } = req.params;
  const user_id = req.user.id; // 通过验证获取到的用户ID

  const query = `
    SELECT c.*, u.username AS user_name,
           CASE 
               WHEN l.id IS NOT NULL THEN l.islike 
               ELSE 0 
           END AS is_liked
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN likes l ON c.comment_id = l.comment_id AND l.user_id = ?
    WHERE c.post_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `;

  db.query(query, [user_id, postId], (err, results) => {
    if (err) {
      console.error('获取评论失败:', err);
      return res.status(500).json({ success: false, message: '获取评论失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 获取特定评论的回复

app.get('/api/comments/:commentId/replies', verifyToken, (req, res) => {
  const { commentId } = req.params;
  const user_id = req.user.id; // 通过验证获取到的用户ID

  const query = `
    SELECT c.*, u.username AS user_name,
           CASE 
               WHEN l.id IS NOT NULL THEN l.islike 
               ELSE 0 
           END AS is_liked
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN likes l ON c.comment_id = l.comment_id AND l.user_id = ?
    WHERE c.parent_comment_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC
  `;

  db.query(query, [user_id, commentId], (err, results) => {
    if (err) {
      console.error('获取回复失败:', err);
      return res.status(500).json({ success: false, message: '获取回复失败' });
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  });
});

// 创建新帖子

app.post('/api/posts', verifyToken, (req, res) => {
  const { title, content, category_id } = req.body;
  const user_id = req.user.id; // 假设通过验证获取到的用户ID

  const query = `
    INSERT INTO posts (user_id, title, content, category_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, title, content, category_id], (err, result) => {
    if (err) {
      console.error('创建帖子失败:', err);
      return res.status(500).json({ success: false, message: '创建帖子失败' });
    }
    
    res.status(201).json({
      success: true,
      message: '帖子创建成功',
      data: { post_id: result.insertId }
    });
  });
});

// 创建新评论

app.post('/api/posts/:postId/comments', verifyToken, (req, res) => {
  const { content} = req.body.comment;
  console.log("req.body:",req.body)
  const parent_comment_id = req.body.comment.parent_comment_id || null;
  const user_id = req.user.id; // 假设通过验证获取到的用户ID
  const { postId } = req.params;

  let query;
  let values;

  if (parent_comment_id) {
    // 如果是回复评论，插入评论id
    query = `
      INSERT INTO comments (post_id, user_id, parent_comment_id, content)
      VALUES (?, ?, ?, ?)
    `;
    values = [postId, user_id, parent_comment_id, content];
  } else {
    // 如果是直接回复帖子，不插入评论id
    query = `
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `;
    values = [postId, user_id, content];
  }

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('创建评论失败:', err);
      return res.status(500).json({ success: false, message: '创建评论失败' });
    }
    
    res.status(201).json({
      success: true,
      message: '评论创建成功',
      data: { comment_id: result.insertId }
    });
  });
});

// 通用的权限验证函数
const authorize = (req, authorId, isPostRequest) => {
  // 如果用户角色是0（管理员）则允许操作
  if (req.userRole === 0) {
    return true;
  }
  
  // 如果请求是POST且没有作者ID（可能是在创建新内容），则允许操作
  if (isPostRequest && !authorId) {
    return true;
  }
  
  // 验证是否是内容的发布者
  return req.userId === authorId;
};

// 获取帖子作者ID的函数
const getPostAuthorId = (postId, callback) => {
  const query = `SELECT user_id FROM posts WHERE post_id = ?`;
  db.query(query, [postId], (err, results) => {
    if (err) return callback(err);
    callback(null, results.length > 0 ? results[0].user_id : null);
  });
};

// 获取评论作者ID的函数
const getCommentAuthorId = (commentId, callback) => {
  const query = `SELECT user_id FROM comments WHERE comment_id = ?`;
  db.query(query, [commentId], (err, results) => {
    if (err) return callback(err);
    callback(null, results.length > 0 ? results[0].user_id : null);
  });
};

// 删除帖子的API
app.put('/api/posts/:postId', verifyToken, (req, res) => {
  const { postId } = req.params;

  // 先获取帖子作者ID
  getPostAuthorId(postId, (err, authorId) => {
    if (err) {
      console.error('获取帖子作者失败:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    if (!authorId) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查权限
    if (!authorize(req, authorId, false)) {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }

    // 如果有权限，继续执行删除操作
    const query = `
      UPDATE posts
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE post_id = ?
    `;

    db.query(query, [postId], (err, result) => {
      if (err) {
        console.error('删除帖子失败:', err);
        return res.status(500).json({ success: false, message: '删除帖子失败' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '帖子不存在' });
      }
      
      res.status(200).json({
        success: true,
        message: '帖子已删除'
      });
    });
  });
});

// 软删除评论的API（已修改）
app.put('/api/comments/:commentId', verifyToken, (req, res) => {
  const { commentId } = req.params;

  // 先获取评论作者ID
  getCommentAuthorId(commentId, (err, authorId) => {
    if (err) {
      console.error('获取评论作者失败:', err);
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    if (!authorId) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    // 检查权限
    if (!authorize(req, authorId, false)) {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }

    // 如果有权限，继续执行删除操作
    const query = `
      UPDATE comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE comment_id = ?
    `;

    db.query(query, [commentId], (err, result) => {
      if (err) {
        console.error('删除评论失败:', err);
        return res.status(500).json({ success: false, message: '删除评论失败' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '评论不存在' });
      }
      
      res.status(200).json({
        success: true,
        message: '评论已删除'
      });
    });
  });
});

//帖子点赞功能

app.post('/api/likes', verifyToken, (req, res) => {
  const { postId, commentId } = req.body; // 从请求体中获取 postId 和 commentId
  const user_id = req.user.id; // 假设通过验证获取到的用户ID

  // 判断是点赞帖子还是评论，确保只有其中一个有值
  let targetId = null;
  let isPostLike = false;

  if (postId) {
    targetId = postId;
    isPostLike = true;
  } else if (commentId) {
    targetId = commentId;
    isPostLike = false;
  } else {
    return res.status(400).json({ success: false, message: '必须提供 postId 或 commentId' });
  }

  // 构建查询语句，检查是否已经有点赞记录
  let query;
  let values;

  if (isPostLike) {
    // 点赞帖子
    query = `
      SELECT id, islike FROM likes 
      WHERE user_id = ? AND post_id = ? AND comment_id IS NULL
    `;
    values = [user_id, targetId];
  } else {
    // 点赞评论
    query = `
      SELECT id, islike FROM likes 
      WHERE user_id = ? AND comment_id = ? AND post_id IS NULL
    `;
    values = [user_id, targetId];
  }

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('查询点赞失败:', err);
      return res.status(500).json({ success: false, message: '查询点赞失败' });
    }

    if (results.length > 0) {
      // 如果已经有点赞记录，更新 islike 状态（取反）
      const likeId = results[0].id;
      const newIsLike = results[0].islike === 1 ? 0 : 1;

      let updateQuery;
      let updateValues;

      if (isPostLike) {
        // 更新帖子点赞
        updateQuery = `
          UPDATE likes 
          SET islike = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        updateValues = [newIsLike, likeId];
      } else {
        // 更新评论点赞
        updateQuery = `
          UPDATE likes 
          SET islike = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        updateValues = [newIsLike, likeId];
      }

      db.query(updateQuery, updateValues, (updateErr) => {
        if (updateErr) {
          console.error('更新点赞失败:', updateErr);
          return res.status(500).json({ success: false, message: '更新点赞失败' });
        }

        // 更新对应帖子或评论的点赞数
        if (isPostLike) {
          // 更新帖子的点赞数
          const postLikesQuery = `
            UPDATE posts 
            SET likes = likes + (CASE WHEN ? = 1 THEN 1 ELSE -1 END)
            WHERE post_id = ?
          `;
          db.query(postLikesQuery, [newIsLike, targetId], (postLikesErr) => {
            if (postLikesErr) console.error('更新帖子点赞数失败:', postLikesErr);
          });
        } else {
          // 更新评论的点赞数
          const commentLikesQuery = `
            UPDATE comments 
            SET likes = likes + (CASE WHEN ? = 1 THEN 1 ELSE -1 END)
            WHERE comment_id = ?
          `;
          db.query(commentLikesQuery, [newIsLike, targetId], (commentLikesErr) => {
            if (commentLikesErr) console.error('更新评论点赞数失败:', commentLikesErr);
          });
        }

        res.status(200).json({
          success: true,
          message: newIsLike ? '点赞成功' : '取消点赞成功',
          data: { likeId, isLike: newIsLike }
        });
      });
    } else {
      // 如果没有点赞记录，插入新的点赞记录
      let insertQuery;
      let insertValues;

      if (isPostLike) {
        // 插入帖子点赞
        insertQuery = `
          INSERT INTO likes (user_id, post_id, islike)
          VALUES (?, ?, 1)
        `;
        insertValues = [user_id, targetId];
      } else {
        // 插入评论点赞
        insertQuery = `
          INSERT INTO likes (user_id, comment_id, islike)
          VALUES (?, ?, 1)
        `;
        insertValues = [user_id, targetId];
      }

      db.query(insertQuery, insertValues, (insertErr, insertResult) => {
        if (insertErr) {
          console.error('创建点赞失败:', insertErr);
          return res.status(500).json({ success: false, message: '创建点赞失败' });
        }

        // 更新对应帖子或评论的点赞数
        if (isPostLike) {
          // 更新帖子的点赞数
          const postLikesQuery = `
            UPDATE posts 
            SET likes = likes + 1
            WHERE post_id = ?
          `;
          db.query(postLikesQuery, [targetId], (postLikesErr) => {
            if (postLikesErr) console.error('更新帖子点赞数失败:', postLikesErr);
          });
        } else {
          // 更新评论的点赞数
          const commentLikesQuery = `
            UPDATE comments 
            SET likes = likes + 1
            WHERE comment_id = ?
          `;
          db.query(commentLikesQuery, [targetId], (commentLikesErr) => {
            if (commentLikesErr) console.error('更新评论点赞数失败:', commentLikesErr);
          });
        }

        res.status(201).json({
          success: true,
          message: '点赞成功',
          data: { likeId: insertResult.insertId, isLike: true }
        });
      });
    }
  });
});

// ... existing code ...

// AI助手相关路由
app.post('/api/ai/query', async (req, res) => {
    try {
        const { question } = req.body;
        
        // 解析问题类型
        const questionType = analyzeQuestionType(question);
        
        // 根据问题类型查询数据库
        let result;
        switch(questionType) {
            case 'user_points':
                result = await queryUserPoints(question);
                break;
            case 'activity_info':
                result = await queryActivityInfo(question);
                break;
            case 'club_info':
                result = await queryClubInfo(question);
                break;
            case 'statistics':
                result = await queryStatistics(question);
                break;
            default:
                result = { error: '抱歉，我暂时无法理解您的问题' };
        }
        
        res.json(result);
    } catch (error) {
        console.error('AI查询错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 分析问题类型
function analyzeQuestionType(question) {
    if (question.includes('积分') || question.includes('分数')) {
        return 'user_points';
    } else if (question.includes('活动') || question.includes('比赛')) {
        return 'activity_info';
    } else if (question.includes('社团') || question.includes('协会')) {
        return 'club_info';
    } else if (question.includes('统计') || question.includes('分析')) {
        return 'statistics';
    }
    return 'unknown';
}

// 查询用户积分
async function queryUserPoints(question) {
    const username = extractUsername(question);
    if (!username) {
        return { error: '请指定要查询的用户名' };
    }
    
    const [user] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!user) {
        return { error: '未找到该用户' };
    }
    
    const [points] = await db.query(`
        SELECT SUM(points) as total_points 
        FROM points 
        WHERE user_id = ?
    `, [user.id]);
    
    return {
        type: 'user_points',
        username,
        total_points: points.total_points || 0
    };
}

// 查询活动信息
async function queryActivityInfo(question) {
    const activityName = extractActivityName(question);
    if (!activityName) {
        return { error: '请指定要查询的活动名称' };
    }
    
    const [activity] = await db.query(`
        SELECT a.*, c.name as club_name 
        FROM activities a 
        JOIN clubs c ON a.club_id = c.id 
        WHERE a.title LIKE ?
    `, [`%${activityName}%`]);
    
    if (!activity) {
        return { error: '未找到该活动' };
    }
    
    return {
        type: 'activity_info',
        activity
    };
}

// 查询社团信息
async function queryClubInfo(question) {
    const clubName = extractClubName(question);
    if (!clubName) {
        return { error: '请指定要查询的社团名称' };
    }
    
    const [club] = await db.query(`
        SELECT c.*, u.username as leader_name 
        FROM clubs c 
        JOIN users u ON c.leader_id = u.id 
        WHERE c.name LIKE ?
    `, [`%${clubName}%`]);
    
    if (!club) {
        return { error: '未找到该社团' };
    }
    
    return {
        type: 'club_info',
        club
    };
}

// 查询统计数据
async function queryStatistics(question) {
    if (question.includes('最活跃')) {
        const [mostActiveClub] = await db.query(`
            SELECT c.name, COUNT(a.id) as activity_count 
            FROM clubs c 
            LEFT JOIN activities a ON c.id = a.club_id 
            GROUP BY c.id 
            ORDER BY activity_count DESC 
            LIMIT 1
        `);
        
        return {
            type: 'statistics',
            most_active_club: mostActiveClub
        };
    }
    
    if (question.includes('积分最高')) {
        const [topUser] = await db.query(`
            SELECT u.username, SUM(p.points) as total_points 
            FROM users u 
            LEFT JOIN points p ON u.id = p.user_id 
            GROUP BY u.id 
            ORDER BY total_points DESC 
            LIMIT 1
        `);
        
        return {
            type: 'statistics',
            top_user: topUser
        };
    }
    
    return { error: '请指定具体的统计类型' };
}

// 辅助函数：提取用户名
function extractUsername(question) {
    const match = question.match(/(?:用户|同学|学生)?([\u4e00-\u9fa5a-zA-Z0-9]+)(?:的积分|的分数)/);
    return match ? match[1] : null;
}

// 辅助函数：提取活动名称
function extractActivityName(question) {
    const match = question.match(/(?:活动|比赛)?([\u4e00-\u9fa5a-zA-Z0-9]+)(?:的|是|在)/);
    return match ? match[1] : null;
}

// 辅助函数：提取社团名称
function extractClubName(question) {
    const match = question.match(/(?:社团|协会)?([\u4e00-\u9fa5a-zA-Z0-9]+)(?:的|是|在)/);
    return match ? match[1] : null;
}

